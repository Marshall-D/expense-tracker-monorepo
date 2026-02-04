// packages/server/src/handlers/deleteBudget.ts

/**
 * DELETE /api/budgets/{id}
 *
 * Responsibilities:
 *  - Validate path id
 *  - Ensure authenticated user owns the budget
 *  - Delete the budget and return success
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteBudgetImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // 2) Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 3) Path id resolution (accept id, ID, _id)
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

  // 5) DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");

    // 6) Delete where _id and userId match (owner-only delete)
    const result = await budgets.deleteOne({
      _id: bid,
      userId: new ObjectId(userId),
    });

    // 7) If none deleted -> 404
    if (result.deletedCount === 0)
      return jsonResponse(404, {
        error: "not_found",
        message: "Budget not found.",
      });

    // 8) Success
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("deleteBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteBudgetImpl);
