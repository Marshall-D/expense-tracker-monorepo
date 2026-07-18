import type { NextFunction, Request, Response } from "express";
import { getTokenFromHeader, verifyToken } from "../lib/auth";
import { jsonResponse, send } from "../lib/response";

/**
 * Express middleware: require a valid Bearer JWT.
 * On success attaches payload to req.user.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    send(
      res,
      jsonResponse(401, {
        error: "unauthorized",
        message: "Missing Authorization header.",
      }),
    );
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    send(
      res,
      jsonResponse(401, {
        error: "unauthorized",
        message: "Invalid or expired token.",
      }),
    );
    return;
  }

  req.user = payload;
  next();
}
