// packages/server/src/lib/validation.ts
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ZodType } from "zod";
import { jsonResponse } from "./response";

/**
 * parseJsonBody:
 *  - Safely parse event.body which is expected to be a JSON string (API Gateway style).
 *  - Handles:
 *      * missing or empty body -> treated as empty object {}
 *      * valid JSON -> returns parsed object
 *      * double-encoded JSON (string inside a string) -> unwrap inner JSON
 *      * invalid JSON -> returns an APIGatewayProxyResult (400 invalid_json)
 *
 * Returns:
 *  - { ok: true, data } on success (data is the parsed JS object or {} if no body)
 *  - { ok: false, response } on parse error (response is a ready APIGatewayProxyResult)
 */
export function parseJsonBody(
  event: APIGatewayProxyEvent,
): { ok: true; data: any } | { ok: false; response: APIGatewayProxyResult } {
  // If there's no body or the body is an empty string, treat it as "no payload".
  // This returns an empty object as the parsed body so downstream code can safely
  // attempt to read properties without additional null checks.
  if (!event.body || !event.body.length) return { ok: true, data: {} };

  let parsed: unknown;
  try {
    // Attempt to parse the top-level JSON string.
    parsed = JSON.parse(event.body);
  } catch {
    // If parsing fails, return a 400 with a helpful message.
    return {
      ok: false,
      response: jsonResponse(400, {
        error: "invalid_json",
        message: "Request body contains invalid JSON.",
      }),
    };
  }

  // Handle double-encoded JSON: some clients or gateways stringify twice,
  // resulting in event.body === '"{ \"foo\": \"bar\" }"' which parses to a string.
  // If parsed is a string, try parsing again to get the inner object.
  if (typeof parsed === "string") {
    try {
      const inner = JSON.parse(parsed);
      return { ok: true, data: inner };
    } catch {
      // If the inner parse fails, treat it as invalid JSON.
      return {
        ok: false,
        response: jsonResponse(400, {
          error: "invalid_json",
          message: "Request body contains invalid JSON.",
        }),
      };
    }
  }

  // Otherwise parsed is an object/array/primitive — return it as the body.
  return { ok: true, data: parsed };
}

/**
 * parseAndValidate:
 *  - Combines parseJsonBody + Zod validation into a single helper used by handlers.
 *  - If parsing fails, returns the 400 invalid_json response.
 *  - If validation fails, returns a 400 validation_error with normalized details.
 *  - On success returns { ok: true, data } where `data` is typed according to the schema.
 *
 * Handlers use this to either proceed with typed input or immediately return the
 * provided response (which is already in APIGatewayProxyResult shape).
 */
export function parseAndValidate<T = any>(
  schema: ZodType<T>,
  event: APIGatewayProxyEvent,
): { ok: true; data: T } | { ok: false; response: APIGatewayProxyResult } {
  // 1) Parse the JSON body safely
  const parsed = parseJsonBody(event);
  if (!parsed.ok) return parsed; // early-return with parse error response if any

  // 2) Validate parsed body with Zod
  const result = schema.safeParse(parsed.data);
  if (result.success) return { ok: true, data: result.data };

  // 3) Normalize Zod error structure into an array of { path, message }
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

  // 4) Return standardized 400 validation response
  return {
    ok: false,
    response: jsonResponse(400, {
      error: "validation_error",
      message: "Request validation failed.",
      details: errors,
    }),
  };
}
