// packages/server/src/lib/validators.ts
import { z } from "zod";

/**
 * Register schema
 * - name: non-empty string
 * - email: validated email
 * - password: min 6 chars
 */
export const registerSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("invalid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(1, "password is required"),
});

/**
 * Create expense schema
 * Accept numbers passed as strings by preprocessing
 * date: optional ISO string
 */
export const createExpenseSchema = z.object({
  amount: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() !== "") {
      const n = Number(val);
      return isNaN(n) ? val : n;
    }
    return val;
  }, z.number().positive("amount must be a positive number")),
  currency: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, "category is required").optional(),
  date: z.string().optional(), // accept optional ISO string; handler will convert to Date
});

/**
 * Update expense schema
 * - Allows a partial update of the createExpenseSchema fields.
 * - Requires at least one field to be present.
 */
export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((obj) => obj && Object.keys(obj).length > 0, {
    message: "At least one field must be provided to update.",
  });
