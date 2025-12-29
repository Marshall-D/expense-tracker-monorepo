// packages/client/src/hooks/useExpenses.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import * as expensesService from "@/services/expenseService";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ExpenseCreatePayload,
  ExpensesListResponse,
} from "@/types/expense";

/**
 * useExpenses - fetch paginated expenses list
 * params corresponds to query params supported by the backend (from, to, category, limit, page)
 *
 * Use the options-object form to avoid overload typing conflicts.
 */
export const useExpenses = (params?: Record<string, any>) =>
  useQuery<ExpensesListResponse>({
    queryKey: [queryKeys.expenses, params ?? {}],
    queryFn: () => expensesService.fetchExpenses(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });

/**
 * useCreateExpense - mutation with optimistic update for list cache
 * - mutationFn returns { id: string }
 * - variables are ExpenseCreatePayload
 * - context holds previous cache and optimistic id (used for rollback)
 */
type CreateContext = {
  previous?: ExpensesListResponse;
  optimisticId: string;
};

export const useCreateExpense = () => {
  const qc = useQueryClient();

  return useMutation<
    { id: string }, // mutation result
    Error, // error type
    ExpenseCreatePayload, // variables passed to mutate
    CreateContext // context returned from onMutate
  >({
    mutationFn: (payload: ExpenseCreatePayload) =>
      expensesService.createExpense(payload),

    onMutate: async (payload) => {
      // cancel any outgoing refetches so we don't overwrite optimistic update
      await qc.cancelQueries({ queryKey: [queryKeys.expenses] });

      // get current cached paginated response (if any)
      const previous = qc.getQueryData<ExpensesListResponse | undefined>([
        queryKeys.expenses,
      ]);

      // create optimistic entry
      const optimisticItem = {
        id: `temp-${Date.now()}`,
        userId: null,
        amount: payload.amount,
        currency: payload.currency ?? "USD",
        description: payload.description ?? "",
        category: (payload as any).category ?? "Uncategorized",
        categoryId: (payload as any).categoryId ?? null,
        date: payload.date ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      if (previous) {
        const newData: ExpensesListResponse = {
          ...previous,
          total: previous.total + 1,
          data: [optimisticItem, ...previous.data],
        };
        qc.setQueryData([queryKeys.expenses], newData);
      } else {
        qc.setQueryData<ExpensesListResponse>([queryKeys.expenses], {
          total: 1,
          page: 1,
          limit: 20,
          data: [optimisticItem],
        });
      }

      return { previous, optimisticId: optimisticItem.id };
    },

    onError: (err, variables, context) => {
      // rollback if we have previous cache snapshot
      if (context?.previous) {
        qc.setQueryData([queryKeys.expenses], context.previous);
      }
    },

    onSettled: () => {
      // refresh list and dependent queries (budgets, reports)
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
    },
  });
};
