// packages/server/src/handlers/getAllBudgets.ts

/**
 * GET /api/budgets
 *
 * Responsibilities:
 *  - Validate query params (periodStart, categoryId)
 *  - Return budgets for authenticated user, optionally filtered by periodStart and/or categoryId
 *  - Sort results descending by periodStart
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
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

const getAllBudgetsImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // 2) Auth
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 3) Parse/validate query params
  const parsed = parseQuery(querySchema, event);
  if (!parsed.ok) return parsed.response;
  const { periodStart, categoryId } = parsed.data;

  // 4) DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");

    // 5) Build filter scoped to user
    const filter: any = { userId: new ObjectId(userId) };

    // 6) If periodStart provided, normalize to canonical first-of-month UTC
    if (periodStart) {
      const p = new Date(periodStart);
      const canonical = new Date(
        Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1),
      );
      filter.periodStart = canonical;
    }

    // 7) If categoryId provided, convert to ObjectId for filter
    if (categoryId) {
      filter.categoryId = new ObjectId(categoryId);
    }

    // 8) Query, sort by periodStart desc (most recent budgets first)
    const docs = await budgets.find(filter).sort({ periodStart: -1 }).toArray();

    // 9) Normalize returned docs for API clients
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

    // 10) Return data
    return jsonResponse(200, { data: items });
  } catch (err) {
    console.error("getAllBudgets error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getAllBudgetsImpl);
