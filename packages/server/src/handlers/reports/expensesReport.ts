// packages/server/src/handlers/reports/expensesReport.ts

/**
 * Expenses report export (CSV).
 *
 * Responsibilities:
 *  - Validate `from`, `to`, `format` query params
 *  - Fetch matching expenses with a MAX_ROWS safety limit
 *  - Render CSV (with UTF-8 BOM) and return it with Content-Disposition
 *
 * Behavior and CSV formatting preserved from original implementation.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

/* Query validation schema:
   - `from` and `to` are ISO date strings
   - `format` is optional and defaults to 'csv' */
const querySchema = z.object({
  from: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid from" }),
  to: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid to" }),
  format: z.string().optional().default("csv"),
});

/**
 * Convert an array of values into a CSV row.
 * - Escapes quotes by doubling them (CSV standard).
 * - Wraps fields containing comma/quote/newline in quotes.
 * - Uses ", " (comma + space) as the separator for visual spacing.
 */
function toCSVRow(arr: (string | number | null | undefined)[]) {
  const cells = arr.map((v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // Escape internal double quotes
    const escaped = s.replace(/"/g, '""');
    // If cell contains comma, quote, or newline, wrap it in quotes
    if (/[",\n\r]/.test(s)) return `"${escaped}"`;
    return escaped;
  });
  return cells.join(", ");
}

/* Safety limit to avoid generating very large CSV payloads inline */
const MAX_ROWS = 5000;

/* formatDateOnlyUTC: format a date into YYYY-MM-DD (UTC) for human-friendly CSV output */
function formatDateOnlyUTC(input: any) {
  if (!input) return "";
  try {
    const d = new Date(input);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(input);
  }
}

/* formatAmount: ensures numeric display with two decimal places and thousands separators */
function formatAmount(n: any) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return String(n ?? "");
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/* Core implementation of the export handler */
const expensesExportImpl: APIGatewayProxyHandler = async (event) => {
  // Handle preflight immediately
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Ensure user identity is present (requireAuth wrapper will ensure this)
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Validate query params
  const parsed = parseQuery(querySchema, event);
  if (!parsed.ok) return parsed.response;

  const { from, to, format } = parsed.data;

  // Only CSV supported for now
  if (format !== "csv") {
    return jsonResponse(400, {
      error: "unsupported_format",
      message: "Only CSV supported for now.",
    });
  }

  // Compute inclusive date range (adjust to end-of-day if `to` is midnight)
  const start = new Date(from);
  const end = new Date(to);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0)
    end.setUTCDate(end.getUTCDate() + 1);

  // Acquire DB handle
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message:
        "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
    });

  try {
    // Query for matching expenses (descending by date), limit to MAX_ROWS + 1 to detect overflow
    const expenses = db.collection("expenses");
    const cursor = expenses
      .find({ userId: new ObjectId(userId), date: { $gte: start, $lt: end } })
      .sort({ date: -1 })
      .limit(MAX_ROWS + 1);

    const docs = await cursor.toArray();

    // If more rows than allowed, return 413 asking for alternate export
    if (docs.length > MAX_ROWS) {
      return jsonResponse(413, {
        error: "too_large",
        message: `Export too large for inline CSV; request a signed S3 export (implement later). Rows > ${MAX_ROWS}`,
      });
    }

    // Build CSV rows: header, spacer line, then data rows (with spacer between each)
    const header = ["Date", "Description", "Category", "Amount"];
    const rows: string[] = [];
    rows.push(toCSVRow(header));
    rows.push(""); // blank spacer row for visual spacing

    for (const d of docs) {
      const row = [
        formatDateOnlyUTC(d.date),
        d.description ?? "",
        d.category ?? "",
        formatAmount(d.amount),
      ];
      rows.push(toCSVRow(row));
      // blank spacer line between rows
      rows.push("");
    }

    // Prefix with UTF-8 BOM so Excel/Sheets detect UTF-8 encoding reliably
    const csvContent = "\uFEFF" + rows.join("\n");

    // Construct filename based on requested date range
    const fileName = `expenses_${from}_to_${to}.csv`;

    // Return CSV as text/csv with Content-Disposition for attachment download
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
      body: csvContent,
    };
  } catch (err) {
    // Log and return 500 on unexpected failures
    console.error("expenses.export error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// Wrap and export handler with authentication enforcement
export const handler = requireAuth(expensesExportImpl);
