// packages/server/src/handlers/getBudget.ts

/**
 * GET /api/budgets/{id}
 *
 * Responsibilities:
 *  - Validate path id and authentication
 *  - Return normalized budget document if it belongs to the user
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getBudgetImpl: APIGatewayProxyHandler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Path id resolution
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

  // Validate ObjectId
  let bid: ObjectId;
  try {
    bid = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Budget id is not a valid ObjectId.",
    });
  }

  // DB
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");
    // Find budget owned by this user
    const doc = await budgets.findOne({
      _id: bid,
      userId: new ObjectId(userId),
    });
    if (!doc)
      return jsonResponse(404, {
        error: "not_found",
        message: "Budget not found.",
      });

    // Normalize payload
    const payload = {
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
    return jsonResponse(200, { data: payload });
  } catch (err) {
    console.error("getBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getBudgetImpl);
