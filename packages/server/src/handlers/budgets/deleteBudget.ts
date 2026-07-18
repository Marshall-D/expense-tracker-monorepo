// packages/server/src/handlers/budgets/deleteBudget.ts

/**
 * DELETE /api/budgets/{id}
 *
 * Responsibilities:
 *  - Validate path id
 *  - Ensure authenticated user owns the budget
 *  - Delete the budget and return success
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { getPathId } from "../../lib/params";

export async function deleteBudget(req: Request, res: Response) {
  // 1) Authenticated user id (attached to req by the auth middleware)
  const userId = req.user!.userId;

  // 2) Path id resolution (accept id, ID, _id)
  const id = getPathId(req.params);
  if (!id)
    return send(
      res,
      jsonResponse(400, {
        error: "missing_id",
        message: "Budget id is required",
      }),
    );

  // 3) Validate ObjectId
  let bid: ObjectId;
  try {
    bid = new ObjectId(id);
  } catch {
    return send(
      res,
      jsonResponse(400, {
        error: "invalid_id",
        message: "Budget id is not a valid ObjectId.",
      }),
    );
  }

  // 4) DB handle
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

    // 5) Delete where _id and userId match (owner-only delete)
    const result = await budgets.deleteOne({
      _id: bid,
      userId: new ObjectId(userId),
    });

    // 6) If none deleted -> 404
    if (result.deletedCount === 0)
      return send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Budget not found.",
        }),
      );

    // 7) Success
    return send(res, jsonResponse(200, { success: true }));
  } catch (err) {
    console.error("deleteBudget error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
