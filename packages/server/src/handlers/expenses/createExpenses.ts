// packages/server/src/handlers/expenses/createExpenses.ts
/**
 * POST /api/expenses
 *
 * - Validates incoming JSON body with createExpenseSchema
 * - Resolves categoryId / category name (validates accessibility)
 * - Inserts a normalized expense document into `expenses` collection
 * - Responds with 201 { id } on success
 */

import type { Request, Response } from "express";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, send } from "../../lib/response";
import { createExpenseSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

export async function createExpense(req: Request, res: Response) {
  // 1) Parse and validate the JSON body against createExpenseSchema.
  const parsed = parseAndValidate(createExpenseSchema, req.body);
  if (!parsed.ok) return send(res, parsed.response);

  // 2) Destructure validated values (TypeScript typing for clarity)
  const { amount, currency, description, category, date, categoryId } =
    parsed.data as {
      amount: number;
      currency?: string;
      description?: string;
      category?: string;
      categoryId?: string;
      date?: string;
    };

  // 3) Authenticated user id set by auth middleware
  const userId = req.user!.userId;

  // 4) Acquire DB; if missing, return 503 with helpful message
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
    const categoriesColl = db.collection("categories");
    const expenses = db.collection("expenses");

    // 5) Resolve categoryId and category name to consistent values used in DB
    let resolvedCategoryId: ObjectId | null = null;
    let resolvedCategoryName: string = category ?? "Uncategorized";

    // 5a) If categoryId provided: validate it's a proper ObjectId and accessible
    if (categoryId) {
      try {
        const cid = new ObjectId(categoryId);
        // Allow either user-owned category or global (userId: null)
        const cat = await categoriesColl.findOne({
          _id: cid,
          $or: [{ userId: new ObjectId(userId) }, { userId: null }],
        });
        if (!cat) {
          // invalid or not accessible
          return send(
            res,
            jsonResponse(400, {
              error: "invalid_category",
              message: "Category not found or not accessible.",
            }),
          );
        }
        resolvedCategoryId = cid;
        resolvedCategoryName = cat.name;
      } catch {
        // invalid ObjectId format
        return send(
          res,
          jsonResponse(400, {
            error: "invalid_category_id",
            message: "categoryId is not a valid ObjectId.",
          }),
        );
      }
    } else if (category && category.trim()) {
      // 5b) If only category name provided: try user-specific first, then global
      const userCat = await categoriesColl.findOne({
        name: category,
        userId: new ObjectId(userId),
      });
      const globalCat =
        !userCat &&
        (await categoriesColl.findOne({
          name: category,
          userId: null,
        }));

      const cat = userCat || globalCat;
      if (cat) {
        resolvedCategoryId = cat._id;
        resolvedCategoryName = cat.name;
      } else {
        // not found: keep string only (we don't auto-create here)
        resolvedCategoryId = null;
        resolvedCategoryName = category;
      }
    }

    // 6) Build normalized expense document
    const now = new Date();
    const expenseDoc: any = {
      userId: new ObjectId(userId),
      amount,
      currency: currency ?? "USD",
      description: description ?? "",
      category: resolvedCategoryName,
      categoryId: resolvedCategoryId,
      date: date ? new Date(date) : now,
      createdAt: now,
    };

    // 7) Insert document
    const result = await expenses.insertOne(expenseDoc);

    // 8) Return created id
    return send(res, jsonResponse(201, { id: result.insertedId }));
  } catch (err) {
    // 9) Log and return generic 500 (no internal details leaked)
    console.error("createExpense error:", err);
    return send(
      res,
      jsonResponse(500, {
        error: "server_error",
        message: "Internal server error",
      }),
    );
  }
}
