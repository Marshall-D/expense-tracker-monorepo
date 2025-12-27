// packages/client/src/utils/routes.ts
const ROUTES = {
  // Home
  HOME: "/",

  // Authentication
  LOGIN: "/login",
  REGISTER: "/register",

  // App
  DASHBOARD: "/dashboard",

  // Expenses
  EXPENSES: "/dashboard/expenses",
  EXPENSES_NEW: "/dashboard/expenses/new",
  EXPENSES_BY_ID: (id: string) => `/dashboard/expenses/${id}`,

  // Budgets
  BUDGETS: "/dashboard/budgets",
  BUDGETS_NEW: "/dashboard/budgets/new",
  BUDGETS_BY_ID: (id: string) => `/dashboard/budgets/${id}`,

  // Categories
  CATEGORIES: "/dashboard/categories",
  CATEGORIES_NEW: "/dashboard/categories/new",
  CATEGORIES_BY_ID: (id: string) => `/dashboard/categories/${id}`,

  // Reports
  REPORTS: "/dashboard/reports",
};

export default ROUTES;
