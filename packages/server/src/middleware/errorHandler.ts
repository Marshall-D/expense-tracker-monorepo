import type { NextFunction, Request, Response } from "express";

/**
 * Central Express error handler. Does not leak stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({
    error: "server_error",
    message: "Internal server error",
  });
}
