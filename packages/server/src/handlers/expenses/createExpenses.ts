// packages/server/src/handlers/creatExpenses.ts
/**
 * POST /api/expenses
 *
 * - Validates incoming JSON body with createExpenseSchema
 * - Resolves categoryId / category name (validates accessibility)
 * - Inserts a normalized expense document into `expenses` collection
 * - Responds with 201 { id } on success
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { createExpenseSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * createExpenseImpl - core implementation (not wrapped)
 * - Accepts an APIGateway-style event and returns APIGatewayProxyResult
 */
const createExpenseImpl: APIGatewayProxyHandler = async (event) => {
  // 1) Handle OPTIONS preflight quickly (no auth or DB work)
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // 2) Parse and validate the JSON body against createExpenseSchema.
  //    parseAndValidate returns either { ok: true, data } or { ok: false, response }.
  const parsed = parseAndValidate(createExpenseSchema, event);
  if (!parsed.ok) return parsed.response; // early-return validation error

  // 3) Destructure validated values (TypeScript typing for clarity)
  const { amount, currency, description, category, date, categoryId } =
    parsed.data as {
      amount: number;
      currency?: string;
      description?: string;
      category?: string;
      categoryId?: string;
      date?: string;
    };

  // 4) Get authenticated user id from requestContext.authorizer (set by requireAuth)
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // 5) Acquire DB; if missing, return 503 with helpful message
  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categoriesColl = db.collection("categories");
    const expenses = db.collection("expenses");

    // 6) Resolve categoryId and category name to consistent values used in DB
    let resolvedCategoryId: ObjectId | null = null;
    let resolvedCategoryName: string = category ?? "Uncategorized";

    // 6a) If categoryId provided: validate it's a proper ObjectId and accessible
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
          return jsonResponse(400, {
            error: "invalid_category",
            message: "Category not found or not accessible.",
          });
        }
        resolvedCategoryId = cid;
        resolvedCategoryName = cat.name;
      } catch {
        // invalid ObjectId format
        return jsonResponse(400, {
          error: "invalid_category_id",
          message: "categoryId is not a valid ObjectId.",
        });
      }
    } else if (category && category.trim()) {
      // 6b) If only category name provided: try user-specific first, then global
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

    // 7) Build normalized expense document
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

    // 8) Insert document
    const res = await expenses.insertOne(expenseDoc);

    // 9) Return created id
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    // 10) Log and return generic 500 (no internal details leaked)
    console.error("createExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

// 11) Wrap implementation with requireAuth to enforce JWT auth and export as handler
export const handler = requireAuth(createExpenseImpl);
