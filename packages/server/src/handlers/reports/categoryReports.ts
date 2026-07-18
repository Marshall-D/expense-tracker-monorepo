// packages/server/src/handlers/reports/categoryReports.ts

/**
 * Reports by category for a given date range.
 *
 * Responsibilities:
 *  - Validate `from` / `to` query params
 *  - Aggregate expense totals per category and per supported currency
 *  - Return a JSON response with the aggregated rows
 *
 * This file preserves original behaviour but adds explicit comments to explain
 * each step for easier interview explanation.
 */

import type { Request, Response } from "express";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

/* Zod schema describing expected query parameters.
   - `from` and `to` must be strings parseable as dates. */
const querySchema = z.object({
  from: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid from" }),
  to: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid to" }),
});

/**
 * Core implementation of the report handler.
 */
export const reportsByCategory = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Validate and parse query parameters using parseQuery helper.
  // parseQuery either returns { ok: true, data } or { ok: false, response }.
  const parsed = parseQuery(querySchema, req.query);
  if (!parsed.ok) return send(res, parsed.response);

  // Convert the parsed ISO date strings to Date objects.
  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);

  // Normalize `to` so that if the `to` date is midnight (00:00:00) we treat it
  // as inclusive of that day by moving the `end` to the next UTC day.
  const end = new Date(to);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0)
    end.setUTCDate(end.getUTCDate() + 1);

  // Acquire DB handle via helper (may return null if MONGO_URI not configured).
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
    // Reference the expenses collection
    const expenses = db.collection("expenses");

    // Build a MongoDB aggregation pipeline to:
    // 1) filter by userId and date range
    // 2) group by categoryId & category and sum totals per currency
    // 3) sort by combined total descending
    // 4) project desired output fields
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId), // match only this user's documents
          date: { $gte: from, $lt: end }, // date >= from AND date < end
        },
      },
      {
        $group: {
          _id: { categoryId: "$categoryId", category: "$category" },
          // sum amounts for USD only
          totalUSD: {
            $sum: { $cond: [{ $eq: ["$currency", "USD"] }, "$amount", 0] },
          },
          // sum amounts for NGN only
          totalNGN: {
            $sum: { $cond: [{ $eq: ["$currency", "NGN"] }, "$amount", 0] },
          },
          // sum all amounts (regardless of currency)
          totalAll: { $sum: "$amount" },
        },
      },
      { $sort: { totalAll: -1 } }, // highest total first
      {
        $project: {
          categoryId: "$_id.categoryId",
          category: "$_id.category",
          totalUSD: 1,
          totalNGN: 1,
          _id: 0, // remove internal _id field from output
        },
      },
    ];

    // Execute the aggregation and convert cursor to array
    const rows = await expenses.aggregate(pipeline).toArray();

    // Return a 200 JSON response with the date range and rows by category
    return send(
      res,
      jsonResponse(200, {
        from: parsed.data.from,
        to: parsed.data.to,
        byCategory: rows,
      }),
    );
  } catch (err) {
    // Log the error for debugging and return a 500 server error to the client
    console.error("reports.byCategory error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
};
