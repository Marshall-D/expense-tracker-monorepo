// packages/client/src/services/expenseService.ts
import api from "@/lib/api";
import {
  Expense,
  ExpenseCreatePayload,
  ExpensesListResponse,
} from "@/types/expense";

/**
 * Service functions for expenses (HTTP layer).
 * These are thin wrappers around the axios instance and return response.data.
 */
export const createExpense = async (payload: ExpenseCreatePayload) => {
  const resp = await api.post<{ id: string }>("/api/expenses", payload);
  return resp.data; // { id }
};

export const fetchExpenses = async (params?: {
  from?: string;
  to?: string;
  category?: string;
  categoryId?: string;
  limit?: number;
  page?: number;
  sort?: string;
}): Promise<ExpensesListResponse> => {
  const resp = await api.get<ExpensesListResponse>("/api/expenses", {
    params,
  });
  return resp.data;
};

export const getExpense = async (id: string): Promise<Expense> => {
  const resp = await api.get<Expense>(`/api/expenses/${id}`);
  return resp.data;
};

export const updateExpense = async (
  id: string,
  payload: ExpenseCreatePayload
) => {
  const resp = await api.put(`/api/expenses/${id}`, payload);
  return resp.data;
};

export const deleteExpense = async (id: string) => {
  const resp = await api.delete(`/api/expenses/${id}`);
  return resp.data;
};
