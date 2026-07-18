// packages/server/src/handlers/expenses/updateExpenses.ts

/**
 * PUT /api/expenses/{id}
 *
 * - Validates path id
 * - Validates request body with updateExpenseSchema
 * - Resolves category/categoryId updates and builds a $set payload
 * - Performs findOneAndUpdate and returns updated document
 */

import type { Request, Response } from "express";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, send } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { updateExpenseSchema } from "../../lib/validators";
import { getPathId } from "../../lib/params";

export async function updateExpense(req: Request, res: Response) {
  // 1) Auth
  const userId = req.user!.userId;

  // 2) Path param id resolution
  const id = getPathId(req.params);
  if (!id)
    return send(
      res,
      jsonResponse(400, {
        error: "missing_id",
        message: "Expense id is required in path.",
      }),
    );

  // 3) Validate ObjectId
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return send(
      res,
      jsonResponse(400, {
        error: "invalid_id",
        message: "Expense id is not a valid ObjectId.",
      }),
    );
  }

  // 4) Validate request body using parseAndValidate + schema
  const parsed = parseAndValidate(updateExpenseSchema, req.body);
  if (!parsed.ok) return send(res, parsed.response);
  const updates = parsed.data as any;

  // 5) Ensure at least one field provided
  if (!updates || Object.keys(updates).length === 0) {
    return send(
      res,
      jsonResponse(400, {
        error: "no_updates",
        message: "Provide at least one updatable field.",
      }),
    );
  }

  // 6) DB handle
  const db = await getDb();
  if (!db)
    return send(
      res,
      jsonResponse(503, {
        error: "database_unavailable",
        message: "No database configured.",
      }),
    );

  try {
    const expenses = db.collection("expenses");
    const categoriesColl = db.collection("categories");

    // 7) Build immutable setPayload object for $set
    const setPayload: any = {};

    if (typeof updates.amount !== "undefined")
      setPayload.amount = updates.amount;
    if (typeof updates.currency !== "undefined")
      setPayload.currency = updates.currency;
    if (typeof updates.description !== "undefined")
      setPayload.description = updates.description;
    if (typeof updates.date !== "undefined")
      setPayload.date = updates.date ? new Date(updates.date) : null;

    // 8) Handle categoryId explicit update (can be null to clear)
    if (typeof updates.categoryId !== "undefined") {
      if (updates.categoryId === null) {
        setPayload.categoryId = null;
        setPayload.category = "Uncategorized";
      } else {
        // Validate provided categoryId and accessibility
        try {
          const cid = new ObjectId(updates.categoryId);
          const cat = await categoriesColl.findOne({
            _id: cid,
            $or: [{ userId: new ObjectId(userId) }, { userId: null }],
          });
          if (!cat) {
            return send(
              res,
              jsonResponse(400, {
                error: "invalid_category",
                message: "Category not found or not accessible.",
              }),
            );
          }
          setPayload.categoryId = cid;
          setPayload.category = cat.name;
        } catch {
          return send(
            res,
            jsonResponse(400, {
              error: "invalid_category_id",
              message: "categoryId is not a valid ObjectId.",
            }),
          );
        }
      }
    } else if (typeof updates.category !== "undefined") {
      // 9) Category name update: try to resolve user-specific or global
      const cat =
        (await categoriesColl.findOne({
          name: updates.category,
          userId: new ObjectId(userId),
        })) ||
        (await categoriesColl.findOne({
          name: updates.category,
          userId: null,
        }));

      if (cat) {
        setPayload.categoryId = cat._id;
        setPayload.category = cat.name;
      } else {
        // Unknown category name: store string and clear categoryId
        setPayload.categoryId = null;
        setPayload.category = updates.category;
      }
    }

    // 10) Always set updatedAt timestamp
    setPayload.updatedAt = new Date();

    // 11) Perform findOneAndUpdate returning the updated document
    const result = await expenses.findOneAndUpdate(
      { _id: expenseObjectId, userId: new ObjectId(userId) },
      { $set: setPayload },
      { returnDocument: "after" },
    );

    // 12) If no value, expense not found -> 404
    if (!result.value) {
      return send(
        res,
        jsonResponse(404, {
          error: "not_found",
          message: "Expense not found.",
        }),
      );
    }

    // 13) Normalize updated document into response payload
    const updated = result.value;
    const responseBody = {
      id: String(updated._id),
      userId: updated.userId ? String(updated.userId) : null,
      amount: updated.amount,
      currency: updated.currency,
      description: updated.description,
      category: updated.category,
      categoryId: updated.categoryId ? String(updated.categoryId) : null,
      date: updated.date ? new Date(updated.date).toISOString() : null,
      createdAt: updated.createdAt
        ? new Date(updated.createdAt).toISOString()
        : null,
      updatedAt: updated.updatedAt
        ? new Date(updated.updatedAt).toISOString()
        : null,
    };

    // 14) Return updated resource
    return send(res, jsonResponse(200, { data: responseBody }));
  } catch (err) {
    console.error("updateExpenses error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
