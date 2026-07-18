// packages/server/src/handlers/budgets/createBudget.ts

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

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { parseAndValidate } from "../../lib/validation";
import { createBudgetSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export async function createBudget(req: Request, res: Response) {
  // 1) Parse + validate request body using Zod schema helper
  const parsed = parseAndValidate(createBudgetSchema, req.body);
  if (!parsed.ok) return send(res, parsed.response); // early return on parse/validation error

  // 2) Extract validated fields
  const { categoryId, category, periodStart, amount } = parsed.data as any;

  // 3) Authenticated user id (attached to req by the auth middleware)
  const userId = req.user!.userId;

  // 4) Enforce that budgets are tied to a categoryId (business rule)
  if (
    !categoryId ||
    typeof categoryId !== "string" ||
    categoryId.trim() === ""
  ) {
    return send(
      res,
      jsonResponse(400, {
        error: "missing_category",
        message: "categoryId is required for budgets.",
      }),
    );
  }

  // 5) Acquire DB handle (returns null if MONGO_URI not configured)
  const db = await getDb();
  if (!db)
    return send(
      res,
      jsonResponse(503, {
        error: "database_unavailable",
        message: "No database configured.",
      }),
    );

  try {
    const budgets = db.collection("budgets");
    const categories = db.collection("categories");

    // 6) Resolve categoryId -> ObjectId and ensure accessibility (user-owned or global)
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
        return send(
          res,
          jsonResponse(400, {
            error: "invalid_category",
            message: "Category not found or not accessible.",
          }),
        );
      }
      resolvedCategoryId = cid;
      resolvedCategoryName = cat.name;
    } catch {
      // invalid ObjectId format
      return send(
        res,
        jsonResponse(400, {
          error: "invalid_category_id",
          message: "categoryId is not a valid ObjectId.",
        }),
      );
    }

    // 7) Normalize periodStart to canonical start-of-month (UTC)
    const periodDate = periodStart ? new Date(periodStart) : null;
    if (!periodDate || Number.isNaN(periodDate.getTime())) {
      return send(
        res,
        jsonResponse(400, {
          error: "invalid_period",
          message: "periodStart is required and must be a valid date.",
        }),
      );
    }
    const canonicalPeriodStart = new Date(
      Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth(), 1),
    );

    // 8) Enforce uniqueness: one budget per (userId + categoryId)
    const conflict = await budgets.findOne({
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
    });
    if (conflict) {
      return send(
        res,
        jsonResponse(409, {
          error: "budget_exists",
          message: "Budget for this category already exists.",
        }),
      );
    }

    // 9) Build and insert document
    const now = new Date();
    const doc = {
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
      category: resolvedCategoryName,
      periodStart: canonicalPeriodStart,
      amount,
      createdAt: now,
    };

    const inserted = await budgets.insertOne(doc);

    // 10) Return created id
    return send(res, jsonResponse(201, { id: inserted.insertedId }));
  } catch (err) {
    // 11) On unexpected error log and return 500
    console.error("createBudget error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
