import type { ZodType } from "zod";
import { jsonResponse, type HttpResult } from "./response";

/**
 * Validate Express query params with a Zod schema.
 */
export function parseQuery<T = unknown>(
  schema: ZodType<T>,
  query: unknown,
): { ok: true; data: T } | { ok: false; response: HttpResult } {
  const qs = (query ?? {}) as Record<string, unknown>;
  const result = schema.safeParse(qs);

  if (result.success) return { ok: true, data: result.data };

  const issues = (result.error as { issues?: Array<{ path?: unknown; message?: string }> })
    ?.issues ?? [];
  const details = Array.isArray(issues)
    ? issues.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
        message: e.message ?? "invalid",
      }))
    : [];

  return {
    ok: false,
    response: jsonResponse(400, {
      error: "validation_error",
      details,
    }),
  };
}
