// packages/server/src/handlers/deleteExpense.ts

/**
 * DELETE /api/expenses/{id}
 *
 * - Validates path id and deletes the expense belonging to the authenticated user.
 * - Returns 200 { success: true } on success or 404 if not found.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteExpenseImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // 2) Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 3) Path parameter resolution: accept id, ID, or _id for flexibility
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

  // 4) Validate ObjectId format
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Expense id is not a valid ObjectId.",
    });
  }

  // 5) Acquire DB
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const expenses = db.collection("expenses");

    // 6) Delete by _id and userId to ensure user can only delete own expenses
    const result = await expenses.deleteOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    // 7) If nothing deleted, return 404
    if (result.deletedCount === 0) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    // 8) Success
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("deleteExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteExpenseImpl);
