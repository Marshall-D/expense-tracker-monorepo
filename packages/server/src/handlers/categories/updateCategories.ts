// packages/server/src/handlers/updateCategories.ts
/**
 * PUT /api/categories/{id}
 *
 * Responsibilities:
 *  - Validate path id and request body
 *  - Ensure update is applied only to user-owned categories
 *  - Prevent name collisions (case-insensitive) with global or user's categories
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { updateCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const updateCategoriesImpl: APIGatewayProxyHandler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Path param id resolution
  const pathParams = (event.pathParameters || {}) as Record<
    string,
    string | undefined
  >;
  const id = pathParams.id || pathParams.ID || pathParams._id;
  if (!id)
    return jsonResponse(400, {
      error: "missing_id",
      message: "Category id is required in path.",
    });

  // Validate ObjectId
  let catId: ObjectId;
  try {
    catId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Category id is not a valid ObjectId.",
    });
  }

  // Parse and validate request body
  const parsed = parseAndValidate(updateCategorySchema, event);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data as any;
  if (!updates || Object.keys(updates).length === 0)
    return jsonResponse(400, {
      error: "no_updates",
      message: "Provide at least one field to update.",
    });

  // DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

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
        return jsonResponse(409, {
          error: "category_exists",
          message: "Category with that name already exists (global or yours).",
        });
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
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found or not owned by user.",
      });
    }

    const doc = result.value;
    return jsonResponse(200, {
      data: {
        id: String(doc._id),
        name: doc.name,
        color: doc.color ?? null,
        userId: doc.userId ? String(doc.userId) : null,
        type: doc.userId ? "Custom" : "Global",
      },
    });
  } catch (err) {
    console.error("updateCategories error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(updateCategoriesImpl);
