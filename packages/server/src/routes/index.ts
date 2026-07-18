import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/asyncHandler";
import { health } from "../handlers/health";
import { login, register } from "../handlers/auth";
import { createExpense } from "../handlers/expenses/createExpenses";
import { getAllExpenses } from "../handlers/expenses/getAllExpenses";
import { getExpense } from "../handlers/expenses/getExpense";
import { updateExpense } from "../handlers/expenses/updateExpenses";
import { deleteExpense } from "../handlers/expenses/deleteExpense";
import { createCategory } from "../handlers/categories/createCategories";
import { getAllCategories } from "../handlers/categories/getAllCategories";
import { getCategory } from "../handlers/categories/getCategory";
import { updateCategory } from "../handlers/categories/updateCategories";
import { deleteCategory } from "../handlers/categories/deleteCategory";
import { createBudget } from "../handlers/budgets/createBudget";
import { getAllBudgets } from "../handlers/budgets/getAllBudgets";
import { getBudget } from "../handlers/budgets/getBudget";
import { updateBudget } from "../handlers/budgets/updateBudget";
import { deleteBudget } from "../handlers/budgets/deleteBudget";
import { reportsMonthly } from "../handlers/reports/monthlyReports";
import { reportsByCategory } from "../handlers/reports/categoryReports";
import { reportsTrends } from "../handlers/reports/trendReports";
import { expensesExport } from "../handlers/reports/expensesReport";

export const apiRouter = Router();

apiRouter.get("/health", asyncHandler(health));

apiRouter.post("/auth/register", asyncHandler(register));
apiRouter.post("/auth/login", asyncHandler(login));

apiRouter.post("/expenses", authenticate, asyncHandler(createExpense));
apiRouter.get("/expenses", authenticate, asyncHandler(getAllExpenses));
apiRouter.get("/expenses/:id", authenticate, asyncHandler(getExpense));
apiRouter.put("/expenses/:id", authenticate, asyncHandler(updateExpense));
apiRouter.delete("/expenses/:id", authenticate, asyncHandler(deleteExpense));

apiRouter.post("/categories", authenticate, asyncHandler(createCategory));
apiRouter.get("/categories", authenticate, asyncHandler(getAllCategories));
apiRouter.get("/categories/:id", authenticate, asyncHandler(getCategory));
apiRouter.put("/categories/:id", authenticate, asyncHandler(updateCategory));
apiRouter.delete("/categories/:id", authenticate, asyncHandler(deleteCategory));

apiRouter.post("/budgets", authenticate, asyncHandler(createBudget));
apiRouter.get("/budgets", authenticate, asyncHandler(getAllBudgets));
apiRouter.get("/budgets/:id", authenticate, asyncHandler(getBudget));
apiRouter.put("/budgets/:id", authenticate, asyncHandler(updateBudget));
apiRouter.delete("/budgets/:id", authenticate, asyncHandler(deleteBudget));

apiRouter.get("/reports/monthly", authenticate, asyncHandler(reportsMonthly));
apiRouter.get(
  "/reports/by-category",
  authenticate,
  asyncHandler(reportsByCategory),
);
apiRouter.get("/reports/trends", authenticate, asyncHandler(reportsTrends));
apiRouter.get("/export/expenses", authenticate, asyncHandler(expensesExport));
