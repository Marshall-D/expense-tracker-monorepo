// packages/server/src/handlers/getExpense.ts

/**
 * GET /api/expenses/{id}
 *
 * - Validates path id
 * - Loads the expense for the authenticated user
 * - Returns normalized expense payload
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getExpenseImpl: APIGatewayProxyHandler = async (event) => {
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
  if (!id) {
    return jsonResponse(400, {
      error: "missing_id",
      message: "Expense id is required in path.",
    });
  }

  // 4) Validate ObjectId
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Expense id is not a valid ObjectId.",
    });
  }

  // 5) DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const expenses = db.collection("expenses");

    // 6) Find expense belonging to this user
    const doc = await expenses.findOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    // 7) Not found -> 404
    if (!doc) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    // 8) Normalize response payload
    const payload = {
      id: String(doc._id),
      userId: doc.userId ? String(doc.userId) : null,
      amount: doc.amount,
      currency: doc.currency,
      description: doc.description,
      category: doc.category,
      categoryId: doc.categoryId ? String(doc.categoryId) : null,
      date: doc.date ? new Date(doc.date).toISOString() : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };

    // 9) Return data
    return jsonResponse(200, { data: payload });
  } catch (err) {
    console.error("getExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getExpenseImpl);
