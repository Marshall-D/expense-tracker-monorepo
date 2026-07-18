// packages/server/src/handlers/categories/updateCategories.ts
/**
 * PUT /api/categories/{id}
 *
 * Responsibilities:
 *  - Validate path id and request body
 *  - Ensure update is applied only to user-owned categories
 *  - Prevent name collisions (case-insensitive) with global or user's categories
 */

import type { Request, Response } from "express";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, send } from "../../lib/response";
import { getPathId } from "../../lib/params";
import { updateCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export const updateCategory = async (
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

  // Parse and validate request body
  const parsed = parseAndValidate(updateCategorySchema, req.body);
  if (!parsed.ok) {
    send(res, parsed.response);
    return;
  }
  const updates = parsed.data as any;
  if (!updates || Object.keys(updates).length === 0) {
    send(
      res,
      jsonResponse(400, {
        error: "no_updates",
        message: "Provide at least one field to update.",
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

    // If updating name, check for collisions (case-insensitive) excluding this category
    if (typeof updates.name !== "undefined") {
      const newName = String(updates.name).trim();

      const clash = await categories.findOne(
        {
          name: newName,
          _id: { $ne: catId }, // exclude current category
          $or: [{ userId: null }, { userId: new ObjectId(userId) }],
        },
        { collation: { locale: "en", strength: 2 } }, // case-insensitive
      );

      if (clash) {
        send(
          res,
          jsonResponse(409, {
            error: "category_exists",
            message:
              "Category with that name already exists (global or yours).",
          }),
        );
        return;
      }

      // Normalize the provided name in the update object
      updates.name = newName;
    }

    // Only allow updates to user-owned categories. Global categories are immutable here.
    const result = await categories.findOneAndUpdate(
      { _id: catId, userId: new ObjectId(userId) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result.value) {
      send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Category not found or not owned by user.",
        }),
      );
      return;
    }

    const doc = result.value;
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
    console.error("updateCategories error:", err);
    send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
