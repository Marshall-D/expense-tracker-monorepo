// packages/server/src/handlers/getAllExpenses.ts

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { z } from "zod";

/**
 * Query schema for GET /api/expenses
 */
const getAllExpensesQuerySchema = z.object({
  from: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), {
      message: "invalid from date",
    }),
  to: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), {
      message: "invalid to date",
    }),
  // exact category name match
  category: z.string().min(1).optional(),
  // categoryId must be a 24 hex char string
  categoryId: z
    .string()
    .optional()
    .refine((s) => !s || /^[0-9a-fA-F]{24}$/.test(s), {
      message: "invalid categoryId",
    }),
  q: z.string().optional(), // search query (description OR category)
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) return undefined;
      return Math.max(1, Math.min(100, Math.trunc(n)));
    }),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n)) return undefined;
      return Math.max(1, Math.trunc(n));
    }),
});

// Escape user input for safe RegExp use
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const getAllExpensesImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const rawQs = (event.queryStringParameters || {}) as Record<string, string>;
  const parsed = getAllExpensesQuerySchema.safeParse(rawQs);
  if (!parsed.success) {
    const details = parsed.error.issues.map((e) => ({
      path: Array.isArray(e.path) ? e.path.join(".") : "",
      message: e.message,
    }));
    return jsonResponse(400, {
      error: "validation_error",
      message: "Invalid query parameters",
      details,
    });
  }

  const {
    from,
    to,
    category,
    categoryId,
    q,
    limit: maybeLimit,
    page: maybePage,
  } = parsed.data;

  const limit = typeof maybeLimit === "number" ? maybeLimit : 20;
  const page = typeof maybePage === "number" ? maybePage : 1;
  const skip = (page - 1) * limit;

  const db = await getDb();
  if (!db) {
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });
  }

  try {
    const expenses = db.collection("expenses");

    // base filter: only this user's expenses
    const filter: any = { userId: new ObjectId(userId) };

    // category/categoryId exact filters (if provided)
    if (categoryId) {
      filter.categoryId = new ObjectId(categoryId);
    } else if (category) {
      filter.category = category;
    }

    // date range
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // handle text search (q)
    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(escapeRegex(term), "i");

      // If category/categoryId provided, we already filter by category; in that case
      // apply the search to description only (i.e., both category AND description must match)
      if (category || categoryId) {
        filter.description = { $regex: regex };
      } else {
        // No explicit category filter: search description OR category fields
        // Combine with existing filter (userId etc.)
        filter.$or = [
          { description: { $regex: regex } },
          { category: { $regex: regex } },
        ];
      }
    }

    const total = await expenses.countDocuments(filter);

    const cursor = expenses
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const docs = await cursor.toArray();

    const items = docs.map((d: any) => ({
      id: String(d._id),
      userId: d.userId ? String(d.userId) : null,
      amount: d.amount,
      currency: d.currency,
      description: d.description,
      category: d.category,
      categoryId: d.categoryId ? String(d.categoryId) : null,
      date: d.date ? new Date(d.date).toISOString() : null,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    }));

    return jsonResponse(200, {
      total,
      page,
      limit,
      data: items,
    });
  } catch (err) {
    console.error("getAllExpenses error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getAllExpensesImpl);
