// packages/server/src/lib/query.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ZodType } from "zod";
import { jsonResponse } from "./response";

/**
 * parseQuery:
 *  - Validates and parses query string parameters using a Zod schema.
 *  - Returns either { ok: true, data } on success or { ok: false, response } on failure.
 *
 * Why: Query string parsing/validation is repetitive; this helper centralizes
 * the pattern and returns a ready-made APIGatewayProxyResult for validation failures.
 */
export function parseQuery<T = any>(
  schema: ZodType<T>,
  event: APIGatewayProxyEvent,
): { ok: true; data: T } | { ok: false; response: APIGatewayProxyResult } {
  // 1) Read the query string parameters from the event.
  //    In API Gateway v2 style events this is event.queryStringParameters (a map or null).
  const qs = (event.queryStringParameters || {}) as Record<
    string,
    string | undefined
  >;

  // 2) Validate the query param map against the provided Zod schema.
  const result = schema.safeParse(qs);

  // 3) If validation succeeded, return typed data to the caller.
  if (result.success) return { ok: true, data: result.data };

  // 4) If validation failed, normalize Zod issues into an array of { path, message }.
  const issues = (result.error as any)?.issues ?? [];
  const details = Array.isArray(issues)
    ? issues.map((e: any) => ({
        // e.path may be an array (e.g., ['startDate']), so join to a dotted path.
        path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
        message: e.message ?? "invalid",
      }))
    : [];

  // 5) Return a standardized 400 validation response so handlers can early-return it.
  return {
    ok: false,
    response: jsonResponse(400, {
      error: "validation_error",
      details,
    }),
  };
}
