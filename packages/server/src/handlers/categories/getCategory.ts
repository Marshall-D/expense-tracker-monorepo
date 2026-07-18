// packages/server/src/handlers/categories/getCategory.ts

/**
 * GET /api/categories/{id}
 *
 * Responsibilities:
 *  - Validate path id
 *  - Return category if it is global or owned by the user
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getPathId } from "../../lib/params";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export const getCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.user!.userId;

  // Path param id resolution
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
    // Find category if global (userId:null) or belongs to this user
    const doc = await categories.findOne({
      _id: catId,
      $or: [{ userId: null }, { userId: new ObjectId(userId) }],
    });
    if (!doc) {
      send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Category not found.",
        }),
      );
      return;
    }

    // Return normalized category object
    send(
      res,
      jsonResponse(200, {
        data: {
          id: String(doc._id),
          name: doc.name,
          color: doc.color ?? null,
          userId: doc.userId ? String(doc.userId) : null,
          type: doc.userId ? "Custom" : "Global",
        },
      }),
    );
  } catch (err) {
    console.error("getCategory error:", err);
    send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
