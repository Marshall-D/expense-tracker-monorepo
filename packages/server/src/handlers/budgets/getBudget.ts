// packages/server/src/handlers/budgets/getBudget.ts

/**
 * GET /api/budgets/{id}
 *
 * Responsibilities:
 *  - Validate path id and authentication
 *  - Return normalized budget document if it belongs to the user
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { getPathId } from "../../lib/params";

export async function getBudget(req: Request, res: Response) {
  // Authenticated user id (attached to req by the auth middleware)
  const userId = req.user!.userId;

  // Path id resolution
  const id = getPathId(req.params);
  if (!id)
    return send(
      res,
      jsonResponse(400, {
        error: "missing_id",
        message: "Budget id is required",
      }),
    );

  // Validate ObjectId
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

  // DB
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
    // Find budget owned by this user
    const doc = await budgets.findOne({
      _id: bid,
      userId: new ObjectId(userId),
    });
    if (!doc)
      return send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Budget not found.",
        }),
      );

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
    return send(res, jsonResponse(200, { data: payload }));
  } catch (err) {
    console.error("getBudget error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
