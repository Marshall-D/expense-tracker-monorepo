// packages/server/src/handlers/updateExpenses.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../lib/validation";
import { getDb } from "../lib/mongo";
import { ObjectId } from "mongodb";
import { updateExpenseSchema } from "../lib/validators";

/**
 * PUT /api/expenses/{id}
 * Body: partial of createExpenseSchema (amount, currency, description, category, date)
 */
const updateExpensesImpl: APIGatewayProxyHandler = async (event) => {
  // OPTIONS preflight handled by requireAuth wrapper too, defensive check
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }

  // get authenticated user
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  // id path param must exist
  const pathParams = (event.pathParameters || {}) as Record<
    string,
    string | undefined
  >;
  const id = pathParams.id || pathParams.ID || pathParams._id;
  if (!id) {
    return jsonResponse(400, {
      error: "missing_id",
      message: "Expense id is required in path.",
    });
  }

  // validate ObjectId
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Expense id is not a valid ObjectId.",
    });
  }

  // parse + validate body (partial update)
  const parsed = parseAndValidate(updateExpenseSchema, event);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data;

  // ensure there is at least one field to update (validator enforces this, defensive check)
  if (!updates || Object.keys(updates).length === 0) {
    return jsonResponse(400, {
      error: "no_updates",
      message: "Provide at least one updatable field.",
    });
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

    // build $set payload, convert date if present
    const setPayload: any = {};
    if (typeof updates.amount !== "undefined")
      setPayload.amount = updates.amount;
    if (typeof updates.currency !== "undefined")
      setPayload.currency = updates.currency;
    if (typeof updates.description !== "undefined")
      setPayload.description = updates.description;
    if (typeof updates.category !== "undefined")
      setPayload.category = updates.category;
    if (typeof updates.date !== "undefined")
      setPayload.date = updates.date ? new Date(updates.date) : null;

    setPayload.updatedAt = new Date();

    // Only update expense if it belongs to the authenticated user
    const result = await expenses.findOneAndUpdate(
      { _id: expenseObjectId, userId: new ObjectId(userId) },
      { $set: setPayload },
      { returnDocument: "after" } // return the updated document
    );

    if (!result.value) {
      // not found or not owned by user
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    const updated = result.value;
    const responseBody = {
      id: String(updated._id),
      userId: updated.userId ? String(updated.userId) : null,
      amount: updated.amount,
      currency: updated.currency,
      description: updated.description,
      category: updated.category,
      date: updated.date ? new Date(updated.date).toISOString() : null,
      createdAt: updated.createdAt
        ? new Date(updated.createdAt).toISOString()
        : null,
      updatedAt: updated.updatedAt
        ? new Date(updated.updatedAt).toISOString()
        : null,
    };

    return jsonResponse(200, { data: responseBody });
  } catch (err) {
    console.error("updateExpenses error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(updateExpensesImpl);
