// packages/server/src/handlers/reports/trendReports.ts

/**
 * Trends report handler — returns totals per month for the requested recent months.
 *
 * Responsibilities:
 *  - Validate `months` query param (default to 6)
 *  - Cap months between 1 and 24
 *  - Compute start month (UTC) and aggregate totals per month/currency
 *  - Return an ordered array of month objects with totals for USD and NGN
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

/* Query schema: months is optional string; transform to Number, default will be handled */
const querySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 6)),
});

/* Core implementation */
export const reportsTrends = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Parse and validate query parameters
  const parsedQs = parseQuery(querySchema, req.query);
  if (!parsedQs.ok) return send(res, parsedQs.response);

  // Convert months to a bounded integer: minimum 1, maximum 24
  const monthsRaw = parsedQs.data.months;
  const months = Math.max(1, Math.min(24, monthsRaw));

  // Compute inclusive start month at UTC month boundary.
  // Example: for months=6 and today=2026-01-15, start will be 2025-08-01 UTC.
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );

  // Acquire DB
  const db = await getDb();
  if (!db)
    return send(
      res,
      jsonResponse(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      }),
    );

  try {
    const expenses = db.collection("expenses");

    // Aggregation pipeline:
    // - filter by userId and date >= start
    // - group by year/month and currency, summing amounts
    // - sort by year/month ascending
    const pipeline = [
      { $match: { userId: new ObjectId(userId), date: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            currency: "$currency",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];

    const agg = await expenses.aggregate(pipeline).toArray();

    // Reformat aggregation into a map keyed by YYYY-MM so we can accumulate USD/NGN totals.
    const map = new Map<
      string,
      { month: string; totalUSD: number; totalNGN: number }
    >();
    for (const row of agg) {
      const y = row._id.year;
      const m = String(row._id.month).padStart(2, "0");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, { month: key, totalUSD: 0, totalNGN: 0 });
      if (row._id.currency === "USD") map.get(key)!.totalUSD += row.total;
      else if (row._id.currency === "NGN") map.get(key)!.totalNGN += row.total;
    }

    // Build the ordered output array for each month from `start` to `start + months - 1`
    const out: Array<{ month: string; totalUSD: number; totalNGN: number }> =
      [];
    for (let i = 0; i < months; i++) {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1),
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}`;
      out.push(
        map.get(key) ?? {
          month: key,
          totalUSD: 0,
          totalNGN: 0,
        },
      );
    }

    // Return the ordered months array
    return send(res, jsonResponse(200, { months: out }));
  } catch (err) {
    console.error("reports.trends error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
