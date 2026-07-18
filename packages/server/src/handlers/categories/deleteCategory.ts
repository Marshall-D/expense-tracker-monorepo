// packages/server/src/handlers/categories/deleteCategory.ts

/**
 * DELETE /api/categories/{id}
 *
 * Responsibilities:
 *  - Ensure authenticated user is owner of category
 *  - Delete the category and cascade-update affected expenses to "Uncategorized"
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getPathId } from "../../lib/params";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export const deleteCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.user!.userId;

  // Extract path id (accept multiple param names for robustness)
  const id = getPathId(req.params);
  if (!id) {
    send(
      res,
      jsonResponse(400, {
        error: "missing_id",
        message: "Category id is required in path.",
      }),
    );
    return;
  }

  // Validate ObjectId
  let catId: ObjectId;
  try {
    catId = new ObjectId(id);
  } catch {
    send(
      res,
      jsonResponse(400, {
        error: "invalid_id",
        message: "Category id is not a valid ObjectId.",
      }),
    );
    return;
  }

  // DB handle
  const db = await getDb();
  if (!db) {
    send(
      res,
      jsonResponse(503, {
        error: "database_unavailable",
        message: "No database configured.",
      }),
    );
    return;
  }

  try {
    const categories = db.collection("categories");
    const expenses = db.collection("expenses");

    // Only allow owner to delete (global categories have userId: null so won't match)
    const result = await categories.deleteOne({
      _id: catId,
      userId: new ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Category not found or not owned by user.",
        }),
      );
      return;
    }

    // Cascade-update: set affected expenses to Uncategorized and clear categoryId
    // Update both cases where categoryId was stored as ObjectId or string
    await expenses.updateMany(
      {
        $or: [{ categoryId: catId }, { categoryId: String(catId) }],
      },
      { $set: { categoryId: null, category: "Uncategorized" } },
    );

    // 204 No Content
    send(res, jsonResponse(204, {}));
  } catch (err) {
    console.error("deleteCategory error:", err);
    send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
