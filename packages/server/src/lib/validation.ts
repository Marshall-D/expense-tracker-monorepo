// packages/server/src/lib/validation.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ZodType } from "zod"; // <- use ZodType instead of deprecated ZodSchema

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

export function parseJsonBody(
  event: APIGatewayProxyEvent
): { ok: true; data: any } | { ok: false; response: APIGatewayProxyResult } {
  if (!event.body || !event.body.length) {
    return { ok: true, data: {} };
  }

  try {
    const parsed = JSON.parse(event.body);
    return { ok: true, data: parsed };
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

/**
 * Parse and validate request body using a Zod schema (ZodType).
 * Returns either { ok: true, data } or { ok: false, response } where response is an APIGatewayProxyResult
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

  const errors = result.error.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
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
