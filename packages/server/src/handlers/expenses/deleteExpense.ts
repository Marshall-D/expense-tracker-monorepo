// packages/server/src/handlers/expenses/deleteExpense.ts

/**
 * DELETE /api/expenses/{id}
 *
 * - Validates path id and deletes the expense belonging to the authenticated user.
 * - Returns 200 { success: true } on success or 404 if not found.
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { getPathId } from "../../lib/params";

export async function deleteExpense(req: Request, res: Response) {
  // 1) Auth
  const userId = req.user!.userId;

  // 2) Path parameter resolution: accept id, ID, or _id for flexibility
  const id = getPathId(req.params);
  if (!id) {
    return send(
      res,
      jsonResponse(400, {
        error: "missing_id",
        message: "Expense id is required in path.",
      }),
    );
  }

  // 3) Validate ObjectId format
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return send(
      res,
      jsonResponse(400, {
        error: "invalid_id",
        message: "Expense id is not a valid ObjectId.",
      }),
    );
  }

  // 4) Acquire DB
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
    const expenses = db.collection("expenses");

    // 5) Delete by _id and userId to ensure user can only delete own expenses
    const result = await expenses.deleteOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    // 6) If nothing deleted, return 404
    if (result.deletedCount === 0) {
      return send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Expense not found.",
        }),
      );
    }

    // 7) Success
    return send(res, jsonResponse(200, { success: true }));
  } catch (err) {
    console.error("deleteExpense error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
