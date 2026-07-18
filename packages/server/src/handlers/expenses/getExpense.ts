// packages/server/src/handlers/expenses/getExpense.ts

/**
 * GET /api/expenses/{id}
 *
 * - Validates path id
 * - Loads the expense for the authenticated user
 * - Returns normalized expense payload
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { getPathId } from "../../lib/params";

export async function getExpense(req: Request, res: Response) {
  // 1) Auth
  const userId = req.user!.userId;

  // 2) Path id resolution
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

  // 3) Validate ObjectId
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
    const expenses = db.collection("expenses");

    // 5) Find expense belonging to this user
    const doc = await expenses.findOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    // 6) Not found -> 404
    if (!doc) {
      return send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Expense not found.",
        }),
      );
    }

    // 7) Normalize response payload
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

    // 8) Return data
    return send(res, jsonResponse(200, { data: payload }));
  } catch (err) {
    console.error("getExpense error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
