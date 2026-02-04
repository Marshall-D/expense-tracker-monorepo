// packages/server/src/handlers/deleteCategory.ts

/**
 * DELETE /api/categories/{id}
 *
 * Responsibilities:
 *  - Ensure authenticated user is owner of category
 *  - Delete the category and cascade-update affected expenses to "Uncategorized"
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteCategoryImpl: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Extract path id (accept multiple param names for robustness)
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

  // DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");
    const expenses = db.collection("expenses");

    // Only allow owner to delete (global categories have userId: null so won't match)
    const result = await categories.deleteOne({
      _id: catId,
      userId: new ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found or not owned by user.",
      });
    }

    // Cascade-update: set affected expenses to Uncategorized and clear categoryId
    // Update both cases where categoryId was stored as ObjectId or string
    await expenses.updateMany(
      {
        $or: [{ categoryId: catId }, { categoryId: String(catId) }],
      },
      { $set: { categoryId: null, category: "Uncategorized" } },
    );

    // 204 No Content (jsonResponse used for consistency)
    return jsonResponse(204, {});
  } catch (err) {
    console.error("deleteCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteCategoryImpl);
