/**
 * Auth handlers (register, login)
 */

import type { Request, Response } from "express";
import { getDb } from "../lib/mongo";
import { parseAndValidate } from "../lib/validation";
import { registerSchema, loginSchema } from "../lib/validators";
import { signJwt } from "../lib/jwt";
import { jsonResponse, send } from "../lib/response";
import { comparePassword, hashPassword } from "../lib/password";

export async function register(req: Request, res: Response) {
  try {
    const parsed = parseAndValidate(registerSchema, req.body);
    if (!parsed.ok) return send(res, parsed.response);

    const { name, email, password } = parsed.data;

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment.");
      return send(
        res,
        jsonResponse(500, {
          error: "server_error",
          message:
            "Server not configured. JWT_SECRET is missing. Contact the administrator.",
        }),
      );
    }

    const db = await getDb();
    if (!db) {
      return send(
        res,
        jsonResponse(503, {
          error: "database_unavailable",
          message:
            "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in the host environment.",
        }),
      );
    }

    const users = db.collection("users");
    const existing = await users.findOne({ email });
    if (existing) {
      return send(
        res,
        jsonResponse(409, {
          error: "user_exists",
          message: "A user with that email already exists.",
        }),
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      createdAt: now,
    });
    const userId = result.insertedId.toString();
    const token = signJwt({ userId, name });

    return send(
      res,
      jsonResponse(201, {
        user: { id: userId, name, email },
        token,
      }),
    );
  } catch (err: unknown) {
    console.error("register handler error:", err);
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return send(
        res,
        jsonResponse(409, {
          error: "user_exists",
          message: "A user with that email already exists.",
        }),
      );
    }
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = parseAndValidate(loginSchema, req.body);
    if (!parsed.ok) return send(res, parsed.response);

    const { email, password } = parsed.data;

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment.");
      return send(
        res,
        jsonResponse(500, {
          error: "server_error",
          message:
            "Server not configured. JWT_SECRET is missing. Contact the administrator.",
        }),
      );
    }

    const db = await getDb();
    if (!db) {
      return send(
        res,
        jsonResponse(503, {
          error: "database_unavailable",
          message:
            "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in the host environment.",
        }),
      );
    }

    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user) {
      return send(
        res,
        jsonResponse(401, {
          error: "invalid_credentials",
          message: "Invalid email or password.",
        }),
      );
    }

    const passwordHash =
      user.passwordHash ?? user.password ?? user.hashedPassword ?? null;

    if (!passwordHash) {
      console.error("User found without passwordHash", { userId: user._id });
      return send(
        res,
        jsonResponse(500, {
          error: "server_error",
          message: "User record corrupted or misconfigured.",
        }),
      );
    }

    const isMatch = await comparePassword(password, passwordHash);
    if (!isMatch) {
      return send(
        res,
        jsonResponse(401, {
          error: "invalid_credentials",
          message: "Invalid email or password.",
        }),
      );
    }

    const userId = user._id?.toString ? user._id.toString() : String(user._id);
    const token = signJwt({ userId, name: user.name });

    return send(
      res,
      jsonResponse(200, {
        user: { id: userId, name: user.name, email },
        token,
      }),
    );
  } catch (err: unknown) {
    console.error("login handler error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
