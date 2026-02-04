// packages/server/src/handlers/monthlyReports.ts

/**
 * Monthly report handler — returns totals and top categories for a given year/month.
 *
 * Responsibilities:
 *  - Validate `year` and `month` query params
 *  - Compute canonical UTC month boundaries
 *  - Aggregate totals by currency and compute top categories
 *  - Return JSON with totals and top categories
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

/* Query schema: year (YYYY) and month (1-12), both passed as strings and transformed to numbers */
const querySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number),
  month: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number),
});

/* Core implementation */
const reportsMonthlyImpl: APIGatewayProxyHandler = async (event) => {
  // Preflight handling
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Extract userId from requestContext (set by requireAuth wrapper)
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Parse and validate the query parameters
  const parsed = parseQuery(querySchema, event);
  if (!parsed.ok) return parsed.response;

  const { year, month } = parsed.data;

  // Compute canonical UTC month boundaries:
  // start = first day of requested month at 00:00:00 UTC
  // end   = first day of next month at 00:00:00 UTC (exclusive)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  // Acquire DB
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message:
        "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
    });

  try {
    const expenses = db.collection("expenses");

    // Aggregation: totals grouped by currency (USD, NGN)
    const totalsByCurrency = await expenses
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: start, $lt: end },
            currency: { $in: ["USD", "NGN"] },
          },
        },
        {
          $group: {
            _id: "$currency",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg: { $avg: "$amount" },
          },
        },
        { $project: { currency: "$_id", total: 1, count: 1, avg: 1, _id: 0 } },
      ])
      .toArray();

    // Aggregation: top 5 categories by total amount across currencies
    const topCategories = await expenses
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: { categoryId: "$categoryId", category: "$category" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
        {
          $project: {
            categoryId: "$_id.categoryId",
            category: "$_id.category",
            total: 1,
            _id: 0,
          },
        },
      ])
      .toArray();

    // Return the aggregated results and a canonical period label YYYY-MM
    return jsonResponse(200, {
      period: `${year}-${String(month).padStart(2, "0")}`,
      totals: totalsByCurrency,
      topCategories,
    });
  } catch (err) {
    // Log and return 500 on unexpected errors
    console.error("reports.monthly error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// Wrap with requireAuth and export
export const handler = requireAuth(reportsMonthlyImpl);
