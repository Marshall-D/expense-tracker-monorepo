// packages/server/src/handlers/expenses/getAllExpenses.ts

/**
 * GET /api/expenses
 *
 * Responsibilities:
 * - Validate query params (from, to, category, categoryId, categoryIds, q, limit, page)
 * - Build MongoDB filter with precedence: categoryIds > categoryId > category
 * - Support text search (description OR category)
 * - Apply pagination (limit/page) and return { total, page, limit, data }
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { parseQuery } from "../../lib/query";

/* Query validation schema with transforms for numeric params */
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
  category: z.string().min(1).optional(),
  categoryId: z
    .string()
    .optional()
    .refine((s) => !s || /^[0-9a-fA-F]{24}$/.test(s), {
      message: "invalid categoryId",
    }),
  categoryIds: z
    .string()
    .optional()
    .refine(
      (s) => {
        if (!s) return true;
        const parts = s.split(",").filter(Boolean);
        return parts.every((p) => /^[0-9a-fA-F]{24}$/.test(p));
      },
      { message: "invalid categoryIds" },
    ),
  q: z.string().optional(),
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

/* Utility to escape user input for regex usage (prevents accidental regex injection) */
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAllExpenses(req: Request, res: Response) {
  // 1) Auth
  const userId = req.user!.userId;

  // 2) Validate query params centrally
  const parsed = parseQuery(getAllExpensesQuerySchema, req.query);
  if (!parsed.ok) return send(res, parsed.response);

  // 3) Extract params and set defaults for pagination
  const {
    from,
    to,
    category,
    categoryId,
    categoryIds,
    q,
    limit: maybeLimit,
    page: maybePage,
  } = parsed.data;

  const limit = typeof maybeLimit === "number" ? maybeLimit : 20;
  const page = typeof maybePage === "number" ? maybePage : 1;
  const skip = (page - 1) * limit;

  // 4) DB handle
  const db = await getDb();
  if (!db)
    return send(
      res,
      jsonResponse(503, {
        error: "database_unavailable",
        message: "No database configured.",
      }),
    );

  try {
    const expenses = db.collection("expenses");

    // 5) Build base filter for this user
    const filter: any = { userId: new ObjectId(userId) };

    // 6) Category precedence:
    // categoryIds (CSV) > categoryId > category name
    if (categoryIds) {
      const parts = categoryIds.split(",").filter(Boolean);
      filter.categoryId = { $in: parts.map((p) => new ObjectId(p)) };
    } else if (categoryId) {
      filter.categoryId = new ObjectId(categoryId);
    } else if (category) {
      filter.category = category;
    }

    // 7) Date range
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // 8) Text search q: if category-filter present, search description only,
    // otherwise search description OR category.
    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(escapeRegex(term), "i");

      if (category || categoryId || categoryIds) {
        filter.description = { $regex: regex };
      } else {
        filter.$or = [
          { description: { $regex: regex } },
          { category: { $regex: regex } },
        ];
      }
    }

    // 9) Count total documents for pagination metadata
    const total = await expenses.countDocuments(filter);

    // 10) Query with sorting, skip, limit
    const cursor = expenses
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const docs = await cursor.toArray();

    // 11) Normalize output documents into lightweight DTOs
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

    // 12) Return paginated response
    return send(
      res,
      jsonResponse(200, {
        total,
        page,
        limit,
        data: items,
      }),
    );
  } catch (err) {
    console.error("getAllExpenses error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
