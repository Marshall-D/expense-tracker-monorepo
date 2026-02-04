// packages/server/src/handlers/createBudget.ts

/**
 * POST /api/budgets
 *
 * Responsibilities:
 *  - Validate request body against createBudgetSchema
 *  - Resolve category/categoryId and ensure the user may reference it
 *  - Normalize periodStart to canonical start-of-month (UTC)
 *  - Enforce uniqueness per (userId, categoryId)
 *  - Insert the budget document and return inserted id
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { createBudgetSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

/* Core implementation (not wrapped) */
const createBudgetImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Short-circuit OPTIONS preflight with standardized response
  if (event.httpMethod === "OPTIONS") {
    return emptyOptionsResponse();
  }

  // 2) Parse + validate request body using Zod schema helper
  const parsed = parseAndValidate(createBudgetSchema, event);
  if (!parsed.ok) return parsed.response; // early return on parse/validation error

  // 3) Extract validated fields
  const { categoryId, category, periodStart, amount } = parsed.data as any;

  // 4) Get authenticated user id from requestContext.authorizer (set by requireAuth)
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 5) Enforce that budgets are tied to a categoryId (business rule)
  if (
    !categoryId ||
    typeof categoryId !== "string" ||
    categoryId.trim() === ""
  ) {
    return jsonResponse(400, {
      error: "missing_category",
      message: "categoryId is required for budgets.",
    });
  }

  // 6) Acquire DB handle (returns null if MONGO_URI not configured)
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");
    const categories = db.collection("categories");

    // 7) Resolve categoryId -> ObjectId and ensure accessibility (user-owned or global)
    let resolvedCategoryId: ObjectId | null = null;
    let resolvedCategoryName: string = category ?? "Uncategorized";

    try {
      const cid = new ObjectId(categoryId);
      const cat = await categories.findOne({
        _id: cid,
        $or: [{ userId: new ObjectId(userId) }, { userId: null }],
      });
      if (!cat) {
        // category does not exist or not accessible by this user
        return jsonResponse(400, {
          error: "invalid_category",
          message: "Category not found or not accessible.",
        });
      }
      resolvedCategoryId = cid;
      resolvedCategoryName = cat.name;
    } catch {
      // invalid ObjectId format
      return jsonResponse(400, {
        error: "invalid_category_id",
        message: "categoryId is not a valid ObjectId.",
      });
    }

    // 8) Normalize periodStart to canonical start-of-month (UTC)
    const periodDate = periodStart ? new Date(periodStart) : null;
    if (!periodDate || Number.isNaN(periodDate.getTime())) {
      return jsonResponse(400, {
        error: "invalid_period",
        message: "periodStart is required and must be a valid date.",
      });
    }
    const canonicalPeriodStart = new Date(
      Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth(), 1),
    );

    // 9) Enforce uniqueness: one budget per (userId + categoryId)
    const conflict = await budgets.findOne({
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
    });
    if (conflict) {
      return jsonResponse(409, {
        error: "budget_exists",
        message: "Budget for this category already exists.",
      });
    }

    // 10) Build and insert document
    const now = new Date();
    const doc = {
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
      category: resolvedCategoryName,
      periodStart: canonicalPeriodStart,
      amount,
      createdAt: now,
    };

    const res = await budgets.insertOne(doc);

    // 11) Return created id
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    // 12) On unexpected error log and return 500
    console.error("createBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// 13) Wrap with requireAuth to enforce JWT auth
export const handler = requireAuth(createBudgetImpl);
