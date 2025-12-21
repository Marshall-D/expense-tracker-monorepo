// packages/server/src/local-dev.ts
import "dotenv/config";
import type { APIGatewayProxyResult } from "aws-lambda";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

// import handlers (ensure these files exist)
import { handler as healthHandler } from "./handlers/health";
import { register as authRegister } from "./handlers/auth";

const app = express();
app.use(bodyParser.json());
app.use(cors()); // allow CORS for local dev

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// helper: convert express request -> APIGateway event-like object
function toApiGatewayEvent(req: Request) {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query as Record<string, string> | null,
    body:
      req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "",
    requestContext: {
      identity: { sourceIp: req.ip },
    },
  } as any;
}

// helper: convert APIGatewayProxyResult -> express response
function sendApiResponse(res: Response, result: APIGatewayProxyResult | void) {
  if (!result) {
    return res.status(500).json({ error: "handler_returned_no_response" });
  }
  const statusCode = result.statusCode ?? 200;
  const headers = (result.headers as Record<string, string>) ?? {};
  // Ensure CORS header present
  res.set({ "Access-Control-Allow-Origin": "*", ...headers } as any);
  // if body is JSON string already, try to parse for pretty response
  const body = result.body ?? "";
  // If content-type indicates JSON, send parsed; else send raw
  const contentType =
    headers["Content-Type"] ?? headers["content-type"] ?? "application/json";
  if (contentType.includes("application/json")) {
    try {
      return res.status(statusCode).send(JSON.parse(body as string));
    } catch {
      return res.status(statusCode).send(body);
    }
  }
  return res.status(statusCode).send(body);
}

// Health route (existing)
app.get("/api/health", async (_req, res) => {
  try {
    const result = (await healthHandler(
      {} as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev health handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Auth register route (POST)
app.post("/api/auth/register", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await authRegister(
      event as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev auth.register handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// generic fallback for OPTIONS preflight for various endpoints
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res
      .set(CORS_HEADERS as any)
      .status(204)
      .send("");
    return;
  }
  next();
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () =>
  console.log("Local server running on http://localhost:" + port)
);
