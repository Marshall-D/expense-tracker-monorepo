// packages/server/src/handlers/budgets/getAllBudgets.ts

/**
 * GET /api/budgets
 *
 * Responsibilities:
 *  - Validate query params (periodStart, categoryId)
 *  - Return budgets for authenticated user, optionally filtered by periodStart and/or categoryId
 *  - Sort results descending by periodStart
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { parseQuery } from "../../lib/query";

/* Query schema for optional filters */
const querySchema = z.object({
  periodStart: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), {
      message: "invalid periodStart",
    }),
  categoryId: z
    .string()
    .optional()
    .refine((s) => !s || /^[0-9a-fA-F]{24}$/.test(s), {
      message: "invalid categoryId",
    }),
});

export async function getAllBudgets(req: Request, res: Response) {
  // 1) Authenticated user id (attached to req by the auth middleware)
  const userId = req.user!.userId;

  // 2) Parse/validate query params
  const parsed = parseQuery(querySchema, req.query);
  if (!parsed.ok) return send(res, parsed.response);
  const { periodStart, categoryId } = parsed.data;

  // 3) DB handle
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
    const budgets = db.collection("budgets");

    // 4) Build filter scoped to user
    const filter: any = { userId: new ObjectId(userId) };

    // 5) If periodStart provided, normalize to canonical first-of-month UTC
    if (periodStart) {
      const p = new Date(periodStart);
      const canonical = new Date(
        Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1),
      );
      filter.periodStart = canonical;
    }

    // 6) If categoryId provided, convert to ObjectId for filter
    if (categoryId) {
      filter.categoryId = new ObjectId(categoryId);
    }

    // 7) Query, sort by periodStart desc (most recent budgets first)
    const docs = await budgets.find(filter).sort({ periodStart: -1 }).toArray();

    // 8) Normalize returned docs for API clients
    const items = docs.map((d: any) => ({
      id: String(d._id),
      userId: d.userId ? String(d.userId) : null,
      category: d.category,
      categoryId: d.categoryId ? String(d.categoryId) : null,
      periodStart: d.periodStart ? new Date(d.periodStart).toISOString() : null,
      amount: d.amount,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    }));

    // 9) Return data
    return send(res, jsonResponse(200, { data: items }));
  } catch (err) {
    console.error("getAllBudgets error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
