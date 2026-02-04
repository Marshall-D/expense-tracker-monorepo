// packages/server/src/handlers/getAllCategories.ts

/**
 * GET /api/categories
 *
 * Responsibilities:
 *  - Return both global and user-specific categories visible to the user
 *  - Sort user-owned categories first, then by name (ascending)
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getAllCategoriesImpl: APIGatewayProxyHandler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");

    // Fetch categories that are either global (userId: null) or owned by this user
    // Sort: user-owned first (userId: -1) then by name ascending
    const cursor = categories
      .find({ $or: [{ userId: null }, { userId: new ObjectId(userId) }] })
      .sort({ userId: -1, name: 1 });
    const docs = await cursor.toArray();

    // Normalize documents returned to the client-friendly shape
    const items = docs.map((d: any) => ({
      id: String(d._id),
      name: d.name,
      color: d.color ?? null,
      userId: d.userId ? String(d.userId) : null,
      type: d.userId ? "Custom" : "Global",
    }));
    return jsonResponse(200, { data: items });
  } catch (err) {
    console.error("getAllCategories error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getAllCategoriesImpl);
