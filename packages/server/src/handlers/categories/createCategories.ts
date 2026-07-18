// packages/server/src/handlers/categories/createCategories.ts

/**
 * POST /api/categories
 *
 * Responsibilities:
 *  - Validate request body using createCategorySchema
 *  - Prevent duplicate names (case-insensitive) against global or user's categories
 *  - Insert a new user-owned category document and return metadata
 */

import type { Request, Response } from "express";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, send } from "../../lib/response";
import { createCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * createCategory
 * - Core implementation of POST /api/categories
 * - Uses parseAndValidate to parse/validate body, then writes to DB
 */
export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Parse and validate JSON body against schema
  const parsed = parseAndValidate(createCategorySchema, req.body);
  if (!parsed.ok) {
    send(res, parsed.response);
    return;
  }

  // Normalize name: trim whitespace but keep original casing for display
  const rawName = parsed.data.name as string;
  const name = rawName.trim();
  const color = parsed.data.color as string | undefined;

  // Get authenticated user id (attached by the authenticate middleware)
  const userId = req.user!.userId;

  // Acquire DB connection
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
      send(
        res,
        jsonResponse(409, {
          error: "category_exists",
          message: "Category with that name already exists (global or yours).",
        }),
      );
      return;
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
    const result = await categories.insertOne(doc);

    // Return created metadata (201)
    send(
      res,
      jsonResponse(201, {
        data: {
          id: String(result.insertedId),
          name,
          color: color ?? null,
          userId, // keep behaviour: return raw userId string
          type: "Custom",
        },
      }),
    );
  } catch (err) {
    console.error("createCategory error:", err);
    send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
