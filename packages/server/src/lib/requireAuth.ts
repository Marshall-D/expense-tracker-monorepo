// packages/server/src/lib/requireAuth.ts
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { getTokenFromHeader, verifyToken } from "./auth";

/**
 * Standard CORS headers used for auth responses.
 * Kept here so every auth-related response shares the same header set.
 */
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Small helper to build a JSON APIGatewayProxyResult with our CORS headers.
 * Keeps responses consistent and testable.
 */
function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * requireAuth is a higher-order function:
 * - Accepts a Lambda-style handler (APIGatewayProxyHandler)
 * - Returns a new handler that:
 *    - short-circuits OPTIONS preflight
 *    - extracts and verifies Bearer JWT from Authorization header
 *    - on success attaches minimal authorizer info to event.requestContext
 *    - calls the wrapped handler and returns its result (or an empty 204)
 *
 * This keeps authentication logic centralized and avoids duplication across handlers.
 */
export function requireAuth(
  handler: APIGatewayProxyHandler,
): APIGatewayProxyHandler {
  return async (event, context, callback) => {
    // 1) Allow CORS preflight to succeed immediately without auth
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    // 2) Extract Authorization header (handles both lower- and upper-case keys)
    const authHeader =
      (event.headers as Record<string, string | undefined>)?.authorization ??
      (event.headers as any)?.Authorization;

    // 3) Parse Bearer token from header. If missing -> 401
    const token = getTokenFromHeader(authHeader);
    if (!token) {
      return json(401, {
        error: "unauthorized",
        message: "Missing Authorization header.",
      });
    }

    // 4) Verify JWT using the verifyToken helper.
    //    verifyToken returns the payload on success or null on failure.
    const payload = verifyToken(token);
    if (!payload) {
      return json(401, {
        error: "unauthorized",
        message: "Invalid or expired token.",
      });
    }

    // 5) Attach minimal authorizer information to the event.requestContext.
    //    This is the standard way Lambda authorizers expose identity to handlers.
    event.requestContext = {
      ...(event.requestContext || {}),
      authorizer: { userId: payload.userId, name: payload.name },
    } as any;

    // 6) Call the wrapped handler. If it returns undefined, normalize to 204.
    const result = await handler(event, context, callback);
    return (
      result ?? {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      }
    );
  };
}
