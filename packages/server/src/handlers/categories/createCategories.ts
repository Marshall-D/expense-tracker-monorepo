// packages/server/src/handlers/createCategories.ts

/**
 * POST /api/categories
 *
 * Responsibilities:
 *  - Validate request body using createCategorySchema
 *  - Prevent duplicate names (case-insensitive) against global or user's categories
 *  - Insert a new user-owned category document and return metadata
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { createCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * createCategoryImpl
 * - Core implementation of POST /api/categories (not wrapped)
 * - Uses parseAndValidate to parse/validate body, then writes to DB
 */
const createCategoryImpl: APIGatewayProxyHandler = async (event) => {
  // Short-circuit CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return emptyOptionsResponse();
  }

  // Parse and validate JSON body against schema
  const parsed = parseAndValidate(createCategorySchema, event);
  if (!parsed.ok) return parsed.response; // early return on invalid payload

  // Normalize name: trim whitespace but keep original casing for display
  const rawName = parsed.data.name as string;
  const name = rawName.trim();
  const color = parsed.data.color as string | undefined;

  // Get authenticated user id from requestContext.authorizer (requireAuth will ensure presence)
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Acquire DB connection
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");

    // Prevent duplicates: check for existing category with same name that is global (userId:null)
    // or owned by this user. Use collation with strength:2 for case-insensitive compare.
    const existing = await categories.findOne(
      {
        name,
        $or: [{ userId: null }, { userId: new ObjectId(userId) }],
      },
      { collation: { locale: "en", strength: 2 } }, // case-insensitive
    );

    if (existing) {
      // 409 Conflict when name already exists for either global or this user
      return jsonResponse(409, {
        error: "category_exists",
        message: "Category with that name already exists (global or yours).",
      });
    }

    // Prepare doc and insert (user-owned custom category)
    const now = new Date();
    const doc = {
      name,
      color: color ?? null,
      userId: new ObjectId(userId),
      createdAt: now,
      updatedAt: now,
    };
    const res = await categories.insertOne(doc);

    // Return created metadata (201)
    return jsonResponse(201, {
      data: {
        id: String(res.insertedId),
        name,
        color: color ?? null,
        userId, // keep behaviour: return raw userId string
        type: "Custom",
      },
    });
  } catch (err) {
    console.error("createCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// Export wrapped handler (requireAuth enforces JWT and attaches authorizer)
export const handler = requireAuth(createCategoryImpl);
