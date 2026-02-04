// local-dev.ts is an Express-based local server that mounts the same AWS Lambda-style handler functions used in production.
//  It converts incoming Express requests into an API Gateway-like event object, calls the Lambda handler, then converts the handler’s APIGatewayProxyResult back into an Express response.
//  This gives local dev parity with production handler logic while still allowing fast iteration with ts-node-dev.

// local-dev.ts
// Local Express harness that adapts HTTP requests to the same Lambda handlers
// used in production. This file is executed during local development to provide
// parity between local and deployed behavior.

// Load environment variables from packages/server/.env (dotenv/config auto-run)
import "dotenv/config";

import type { APIGatewayProxyResult } from "aws-lambda";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

// Import Lambda-style handlers (these are the same functions deployed to AWS).
// Each handler follows the handler(event, context, callback) signature.
import { handler as healthHandler } from "./handlers/health";
import { register as authRegister, login } from "./handlers/auth";

// Expenses handlers (create, get all, get single, update, delete)
import { handler as createExpenseHandler } from "./handlers/expenses/createExpenses";
import { handler as getAllExpensesHandler } from "./handlers/expenses/getAllExpenses";
import { handler as getExpenseHandler } from "./handlers/expenses/getExpense";
import { handler as updateExpensesHandler } from "./handlers/expenses/updateExpenses";
import { handler as deleteExpenseHandler } from "./handlers/expenses/deleteExpense";

// Categories handlers
import { handler as createCategoryHandler } from "./handlers/categories/createCategories";
import { handler as getAllCategoriesHandler } from "./handlers/categories/getAllCategories";
import { handler as getCategoryHandler } from "./handlers/categories/getCategory";
import { handler as updateCategoriesHandler } from "./handlers/categories/updateCategories";
import { handler as deleteCategoryHandler } from "./handlers/categories/deleteCategory";

// Budgets handlers
import { handler as createBudgetHandler } from "./handlers/budgets/createBudget";
import { handler as getAllBudgetsHandler } from "./handlers/budgets/getAllBudgets";
import { handler as getBudgetHandler } from "./handlers/budgets/getBudget";
import { handler as updateBudgetHandler } from "./handlers/budgets/updateBudget";
import { handler as deleteBudgetHandler } from "./handlers/budgets/deleteBudget";

// Reports handlers
import { handler as reportsMonthlyHandler } from "./handlers/reports/monthlyReports";
import { handler as reportsByCategoryHandler } from "./handlers/reports/categoryReports";
import { handler as reportsTrendsHandler } from "./handlers/reports/trendReports";
import { handler as expensesExportHandler } from "./handlers/reports/expensesReport";

// Utility to assert required env vars are present (throws / exits for missing)
import { assertEnv } from "./lib/env";

/* ----------------------
   runtime sanity checks
   ---------------------- */
// Ensure required runtime env variables are set for local dev.
// If missing, assertEnv should exit/throw with a useful message.
assertEnv("MONGO_URI", "Set MONGO_URI in packages/server/.env or SSM");
assertEnv("JWT_SECRET", "Set JWT_SECRET in packages/server/.env or SSM");

/* ----------------------
   express app setup
   ---------------------- */
const app = express();

// Parse incoming JSON bodies into req.body
app.use(bodyParser.json());

// Use CORS for local dev so the client (often served from another port) can call the API.
app.use(cors());

// Standard CORS headers used when we manually respond to OPTIONS or set headers explicitly.
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // Allow all origins for local dev (note: relax in prod)
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
} as Record<string, string>;

/* ----------------------
   helpers: conversion between Express <-> API Gateway
   ---------------------- */

/**
 * Convert an Express Request into a shape resembling API Gateway's event.
 * Lambda handlers expect an `event` with properties like httpMethod, path,
 * headers, queryStringParameters and stringified body.
 */
function toApiGatewayEvent(req: Request) {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    // API Gateway uses a flat map for query string params; convert accordingly.
    queryStringParameters:
      Object.keys(req.query).length > 0
        ? (req.query as Record<string, string>)
        : null,
    // Handler expects a string body; stringify if it's an object, otherwise empty string.
    body:
      req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "",
    requestContext: {
      identity: { sourceIp: req.ip }, // provide some request context (useful for logs)
    },
  } as any;
}

/**
 * Convert an APIGatewayProxyResult (what the Lambda returns) into an Express response.
 * This function handles setting headers (including CORS) and parsing JSON bodies.
 */
function sendApiResponse(res: Response, result: APIGatewayProxyResult | void) {
  // If handler returned nothing, treat it as an internal error.
  if (!result) {
    return res.status(500).json({ error: "handler_returned_no_response" });
  }

  // Standardize status code and headers
  const statusCode = result.statusCode ?? 200;
  const headers = (result.headers as Record<string, string>) ?? {};

  // Ensure CORS header present and merge with handler headers
  res.set({ "Access-Control-Allow-Origin": "*", ...headers } as any);

  const body = result.body ?? "";

  // Determine content type (case-insensitive)
  const contentType =
    headers["Content-Type"] ?? headers["content-type"] ?? "application/json";

  // If JSON, try to parse for prettier response objects; otherwise send raw body.
  if (contentType.includes("application/json")) {
    try {
      return res.status(statusCode).send(JSON.parse(body as string));
    } catch {
      // if parsing fails (body is plain string), send it raw
      return res.status(statusCode).send(body);
    }
  }

  // Non-JSON (e.g., text/csv or binary) — send as-is
  return res.status(statusCode).send(body);
}

/* ----------------------
   route bindings
   ---------------------- */

/**
 * HEALTH CHECK
 * This route calls the health Lambda handler and forwards its response.
 */
app.get("/api/health", async (_req, res) => {
  try {
    // Lambda-style handlers have signature (event, context, callback)
    const result = (await healthHandler(
      {} as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;

    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev health handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* AUTH routes */

// Register user
app.post("/api/auth/register", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await authRegister(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev auth.register handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await login(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev auth.login handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* EXPENSES routes */

// Create expense
app.post("/api/expenses", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await createExpenseHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.create handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// List all expenses
app.get("/api/expenses", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await getAllExpensesHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.getAll handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update expense by id
app.put("/api/expenses/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    // API Gateway passes pathParameters; emulating that here:
    (event as any).pathParameters = req.params || {};
    const result = (await updateExpensesHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.update handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete expense by id
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await deleteExpenseHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.delete handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single expense by id
app.get("/api/expenses/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await getExpenseHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.get handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* CATEGORIES routes (create, list, get, update, delete) */

app.post("/api/categories", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await createCategoryHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev categories.create handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await getAllCategoriesHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev categories.getAll handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/categories/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await getCategoryHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev categories.get handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await updateCategoriesHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev categories.update handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await deleteCategoryHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev categories.delete handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* OPTIONS preflight handling
   Many browsers issue OPTIONS preflight requests for CORS. This middleware
   intercepts OPTIONS and responds with CORS headers so the real request can proceed.
*/
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

/* BUDGETS routes */

app.post("/api/budgets", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await createBudgetHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev budgets.create handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/budgets", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await getAllBudgetsHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev budgets.getAll handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/budgets/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await getBudgetHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev budgets.get handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/budgets/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await updateBudgetHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev budgets.update handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/budgets/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    (event as any).pathParameters = req.params || {};
    const result = (await deleteBudgetHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev budgets.delete handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* REPORTS and EXPORTS */

app.get("/api/reports/monthly", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await reportsMonthlyHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev reports.monthly handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/reports/by-category", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await reportsByCategoryHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev reports.byCategory handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/reports/trends", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await reportsTrendsHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev reports.trends handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/export/expenses", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await expensesExportHandler(
      event as any,
      {} as any,
      () => null,
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.export handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ----------------------
   start server
   ---------------------- */
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log("Local server running on http://localhost:" + port);
});
