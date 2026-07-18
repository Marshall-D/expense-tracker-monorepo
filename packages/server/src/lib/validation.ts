import type { ZodType } from "zod";
import { jsonResponse, type HttpResult } from "./response";

/**
 * Validate a request body (already parsed by express.json()) with a Zod schema.
 */
export function parseAndValidate<T = unknown>(
  schema: ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: HttpResult } {
  const data = body ?? {};
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };

  const zodError = result.error as {
    errors?: Array<{ path?: unknown; message?: string }>;
    issues?: Array<{ path?: unknown; message?: string }>;
  };
  const rawErrors = Array.isArray(zodError?.errors)
    ? zodError.errors
    : Array.isArray(zodError?.issues)
      ? zodError.issues
      : [];

  const errors = rawErrors.map((e) => ({
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
