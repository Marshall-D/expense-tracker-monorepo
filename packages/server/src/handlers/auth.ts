// packages/server/src/handlers/auth.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/mongo";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RegisterPayload = {
  name?: string;
  email?: string;
  password?: string;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export const register: APIGatewayProxyHandler = async (event) => {
  try {
    // Preflight handling
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    // parse body
    const payload: RegisterPayload =
      event.body && event.body.length ? JSON.parse(event.body) : {};

    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    const password =
      typeof payload.password === "string" ? payload.password : "";

    // basic validation
    if (!name || !email || !password) {
      return json(400, {
        error: "invalid_input",
        message: "name, email and password are required.",
      });
    }
    if (password.length < 6) {
      return json(400, {
        error: "invalid_input",
        message: "password must be at least 6 characters.",
      });
    }

    // ensure JWT secret exists
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured in environment.");
      return json(500, {
        error: "server_error",
        message:
          "Server not configured. JWT_SECRET is missing. Contact the administrator.",
      });
    }

    // get DB (returns null if no URI configured)
    const db = await getDb();
    if (!db) {
      return json(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      });
    }

    const users = db.collection("users");

    // check if user already exists
    const existing = await users.findOne({ email });
    if (existing) {
      return json(409, {
        error: "user_exists",
        message: "A user with that email already exists.",
      });
    }

    // hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      createdAt: now,
    });

    // build JWT payload
    const userId = result.insertedId.toString();
    const token = jwt.sign({ userId, name }, jwtSecret, {
      expiresIn: process.env.JWT_LIFETIME || "7d",
    });

    return json(201, {
      user: { id: userId, name, email },
      token,
    });
  } catch (err: any) {
    console.error("register handler error:", err);
    // Mongo unique index race condition could cause duplicate-key
    if (err?.code === 11000) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "user_exists",
          message: "A user with that email already exists.",
        }),
      };
    }
    return json(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};
