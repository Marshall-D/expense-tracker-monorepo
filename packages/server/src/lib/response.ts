/**
 * HTTP/JSON response helpers for Express.
 * Centralises response formatting so route handlers stay consistent.
 */

import type { Response } from "express";

export type HttpResult = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

/**
 * Build a standard JSON HTTP result.
 */
export function jsonResponse(status: number, body: unknown): HttpResult {
  return {
    status,
    body,
    headers: { "Content-Type": "application/json" },
  };
}

/**
 * Send an HttpResult through Express.
 * Supports JSON bodies and raw string bodies (e.g. CSV export).
 */
export function send(res: Response, result: HttpResult): Response {
  if (result.headers) {
    res.set(result.headers);
  }

  if (result.status === 204 || result.body === undefined) {
    return res.status(result.status).send();
  }

  const contentType =
    result.headers?.["Content-Type"] ??
    result.headers?.["content-type"] ??
    "application/json";

  if (contentType.includes("application/json")) {
    return res.status(result.status).json(result.body);
  }

  return res.status(result.status).send(result.body as string);
}
