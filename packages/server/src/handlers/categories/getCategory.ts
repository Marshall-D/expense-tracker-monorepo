// packages/server/src/handlers/getCategory.ts

/**
 * GET /api/categories/{id}
 *
 * Responsibilities:
 *  - Validate path id
 *  - Return category if it is global or owned by the user
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getCategoryImpl: APIGatewayProxyHandler = async (event) => {
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

  // DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");
    // Find category if global (userId:null) or belongs to this user
    const doc = await categories.findOne({
      _id: catId,
      $or: [{ userId: null }, { userId: new ObjectId(userId) }],
    });
    if (!doc)
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found.",
      });

    // Return normalized category object
    return jsonResponse(200, {
      data: {
        id: String(doc._1d), // careful: original code returns _id; keep that below
        name: doc.name,
        color: doc.color ?? null,
        userId: doc.userId ? String(doc.userId) : null,
        type: doc.userId ? "Custom" : "Global",
      },
    });
  } catch (err) {
    console.error("getCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getCategoryImpl);
