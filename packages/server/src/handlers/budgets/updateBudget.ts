// packages/server/src/handlers/updateBudget.ts

/**
 * PUT /api/budgets/{id}
 *
 * Responsibilities:
 *  - Validate path id and auth
 *  - Validate request body (updateBudgetSchema)
 *  - Resolve category/categoryId updates and accessibility
 *  - Normalize periodStart and detect uniqueness conflicts
 *  - Apply updates and return updated document
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { updateBudgetSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const updateBudgetImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // 2) Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 3) Path id resolution
  const pathParams = (event.pathParameters || {}) as Record<
    string,
    string | undefined
  >;
  const id = pathParams.id || pathParams.ID || pathParams._id;
  if (!id)
    return jsonResponse(400, {
      error: "missing_id",
      message: "Budget id is required",
    });

  // 4) Validate ObjectId
  let bid: ObjectId;
  try {
    bid = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Budget id is not a valid ObjectId.",
    });
  }

  // 5) Validate request body
  const parsed = parseAndValidate(updateBudgetSchema, event);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data as any;

  // 6) Ensure there is at least one field to update
  if (!updates || Object.keys(updates).length === 0)
    return jsonResponse(400, {
      error: "no_updates",
      message: "Provide at least one field to update.",
    });

  // 7) DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");
    const categories = db.collection("categories");

    // 8) Build immutable setPayload for $set
    const setPayload: any = {};

    if (typeof updates.amount !== "undefined")
      setPayload.amount = updates.amount;

    // 9) If categoryId explicitly provided (can be null to remove)
    if (typeof updates.categoryId !== "undefined") {
      if (updates.categoryId === null) {
        setPayload.categoryId = null;
        setPayload.category = "Uncategorized";
      } else {
        try {
          const cid = new ObjectId(updates.categoryId);
          const cat = await categories.findOne({
            _id: cid,
            $or: [{ userId: new ObjectId(userId) }, { userId: null }],
          });
          if (!cat)
            return jsonResponse(400, {
              error: "invalid_category",
              message: "Category not found or not accessible.",
            });
          setPayload.categoryId = cid;
          setPayload.category = cat.name;
        } catch {
          return jsonResponse(400, {
            error: "invalid_category_id",
            message: "categoryId is not a valid ObjectId.",
          });
        }
      }
    } else if (typeof updates.category !== "undefined") {
      // 10) Category name update: try to resolve user-specific then global
      const cat =
        (await categories.findOne({
          name: updates.category,
          userId: new ObjectId(userId),
        })) ||
        (await categories.findOne({ name: updates.category, userId: null }));

      if (cat) {
        setPayload.categoryId = cat._id;
        setPayload.category = cat.name;
      } else {
        setPayload.categoryId = null;
        setPayload.category = updates.category;
      }
    }

    // 11) periodStart normalization (if provided)
    if (typeof updates.periodStart !== "undefined") {
      const p = new Date(updates.periodStart);
      if (Number.isNaN(p.getTime())) {
        return jsonResponse(400, {
          error: "invalid_period",
          message: "periodStart must be valid date.",
        });
      }
      setPayload.periodStart = new Date(
        Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1),
      );
    }

    // 12) Always set updatedAt
    setPayload.updatedAt = new Date();

    // 13) If we changed categoryId, ensure no other budget exists for this user+categoryId
    if (Object.prototype.hasOwnProperty.call(setPayload, "categoryId")) {
      const effectiveCategoryId = setPayload.categoryId;
      if (effectiveCategoryId !== null) {
        const clash = await budgets.findOne({
          _id: { $ne: bid },
          userId: new ObjectId(userId),
          categoryId: effectiveCategoryId,
        });
        if (clash) {
          return jsonResponse(409, {
            error: "budget_exists",
            message: "Budget for this category already exists.",
          });
        }
      }
    }

    // 14) Perform atomic update and return updated document
    const result = await budgets.findOneAndUpdate(
      { _id: bid, userId: new ObjectId(userId) },
      { $set: setPayload },
      { returnDocument: "after" },
    );

    // 15) If not found, return 404
    if (!result.value)
      return jsonResponse(404, {
        error: "not_found",
        message: "Budget not found.",
      });

    // 16) Normalize and return updated document
    const doc = result.value;
    const resp = {
      id: String(doc._id),
      userId: doc.userId ? String(doc.userId) : null,
      category: doc.category,
      categoryId: doc.categoryId ? String(doc.categoryId) : null,
      periodStart: doc.periodStart
        ? new Date(doc.periodStart).toISOString()
        : null,
      amount: doc.amount,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
    return jsonResponse(200, { data: resp });
  } catch (err) {
    console.error("updateBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(updateBudgetImpl);
