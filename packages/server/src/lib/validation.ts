// packages/server/src/lib/validation.ts

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ZodType } from "zod";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Parse event.body which may be:
 *  - empty -> {}
 *  - a JSON string (normal case) -> parsed object
 *  - a JSON-encoded string (double-wrapped) -> unwrap once
 * Returns either ok + data, or ok:false + response
 */
export function parseJsonBody(
  event: APIGatewayProxyEvent
): { ok: true; data: any } | { ok: false; response: APIGatewayProxyResult } {
  if (!event.body || !event.body.length) {
    return { ok: true, data: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return {
      ok: false,
      response: jsonResponse(400, {
        error: "invalid_json",
        message: "Request body contains invalid JSON.",
      }),
    };
  }

  if (typeof parsed === "string") {
    try {
      const inner = JSON.parse(parsed);
      return { ok: true, data: inner };
    } catch {
      return {
        ok: false,
        response: jsonResponse(400, {
          error: "invalid_json",
          message: "Request body contains invalid JSON.",
        }),
      };
    }
  }

  return { ok: true, data: parsed };
}

/**
 * Parse and validate request body using a Zod schema (ZodType).
 * Returns either { ok: true, data } or { ok: false, response }
 */
export function parseAndValidate<T = any>(
  schema: ZodType<T>,
  event: APIGatewayProxyEvent
): { ok: true; data: T } | { ok: false; response: APIGatewayProxyResult } {
  const parsed = parseJsonBody(event);
  if (!parsed.ok) return parsed;

  const result = schema.safeParse(parsed.data);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  // ✅ FIX: always produce an array (never undefined)
  const zodError = result.error as any;
  const rawErrors = Array.isArray(zodError?.errors)
    ? zodError.errors
    : Array.isArray(zodError?.issues)
    ? zodError.issues
    : [];

  const errors = rawErrors.map((e: any) => ({
    path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
    message: e.message ?? "invalid",
  }));

  return {
    ok: false,
    response: jsonResponse(400, {
      error: "validation_error",
      message: "Request validation failed.",
      details: errors,
    }),
  };
}
