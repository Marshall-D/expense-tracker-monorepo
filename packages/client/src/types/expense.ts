// packages/client/src/types/expense.ts

export type ExpenseCreatePayload = {
  amount: number;
  currency?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  date?: string; // ISO
};

export type Expense = {
  id: string;
  userId: string | null;
  amount: number;
  currency: string;
  description: string;
  category: string;
  categoryId?: string | null;
  date?: string | null;
  createdAt?: string | null;
};

export type ExpensesListResponse = {
  total: number;
  page: number;
  limit: number;
  data: Expense[];
};
