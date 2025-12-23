// packages/server/src/handlers/expenses.create.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../lib/validation";
import { createExpenseSchema } from "../lib/validators";
import { getDb } from "../lib/mongo";
import { ObjectId } from "mongodb";

const createExpenseImpl: APIGatewayProxyHandler = async (event) => {
  // OPTIONS preflight handled by requireAuth wrapper too, but keep check for safety
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  // parse + validate body using zod helper
  const parsed = parseAndValidate(createExpenseSchema, event);
  if (!parsed.ok) return parsed.response;

  const { amount, currency, description, category, date } = parsed.data;

  // requireAuth attached authorizer on the event.requestContext
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) {
    // This should rarely happen because requireAuth returns 401 earlier, but defensive check:
    return jsonResponse(401, { error: "unauthorized" });
  }

  const db = await getDb();
  if (!db) {
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });
  }

  try {
    const expenses = db.collection("expenses");
    const now = new Date();
    const expenseDoc = {
      userId: new ObjectId(userId),
      amount,
      currency: currency ?? "USD",
      description: description ?? "",
      category: category ?? "Uncategorized",
      date: date ? new Date(date) : now,
      createdAt: now,
    };

    const res = await expenses.insertOne(expenseDoc);
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    console.error("createExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// export the guarded handler
export const handler = requireAuth(createExpenseImpl);
