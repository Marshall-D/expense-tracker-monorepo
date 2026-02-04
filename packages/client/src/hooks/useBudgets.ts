// packages/client/src/hooks/useBudgets.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as budgetService from "@/services";
import { queryKeys } from "@/lib";
import type { Budget, BudgetCreatePayload, BudgetUpdatePayload } from "@/types";

/**
 * useBudgets(params)
 * - fetches an array of budgets (optionally filtered)
 * - params: { periodStart?: string, categoryId?: string }
 */
export const useBudgets = (params?: Record<string, any>) =>
  useQuery<Budget[]>({
    queryKey: [queryKeys.budgets, params ?? {}],
    queryFn: () => budgetService.fetchBudgets(params),
    staleTime: 1000 * 30,
  });

/**
 * useBudget(id)
 * - fetch a single budget by id
 * - enabled only when id is present
 */
export const useBudget = (id?: string) =>
  useQuery<Budget>({
    queryKey: id ? [queryKeys.budget, id] : [queryKeys.budget, "empty"],
    enabled: Boolean(id),
    queryFn: ({ queryKey }) => {
      const maybeId = queryKey[1] as string | undefined;
      if (!maybeId) return Promise.reject(new Error("Missing id"));
      return budgetService.getBudget(maybeId);
    },
    staleTime: 1000 * 30,
  });

/**
 * useCreateBudget - creates a budget with optimistic update
 * - onMutate: injects a temporary optimistic item into the budgets cache
 * - onError: rollback if provided
 * - onSettled: invalidate relevant queries
 */
type CreateContext = { previous?: Budget[] | undefined; optimisticId?: string };

export const useCreateBudget = () => {
  const qc = useQueryClient();

  return useMutation<any, Error, BudgetCreatePayload, CreateContext>({
    mutationFn: (payload) => budgetService.createBudget(payload),

    onMutate: async (payload) => {
      // cancel ongoing budgets queries
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });

      // snapshot previous budgets for rollback
      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);

      // build optimistic item (minimal fields)
      const optimisticItem: Budget = {
        id: `tmp-${Date.now()}`,
        categoryId: payload.categoryId ?? null,
        amount: payload.amount,
        ...(payload.category ? { category: payload.category } : {}),
      } as any;

      // set optimistic cache
      if (previous) {
        qc.setQueryData<Budget[]>(
          [queryKeys.budgets],
          [optimisticItem, ...previous],
        );
      } else {
        qc.setQueryData<Budget[]>([queryKeys.budgets], [optimisticItem]);
      }

      return { previous, optimisticId: optimisticItem.id };
    },

    onError: (err, variables, context) => {
      // restore previous on error
      if (context?.previous) {
        qc.setQueryData([queryKeys.budgets], context.previous);
      }
    },

    onSettled: () => {
      // refresh data (server is source of truth)
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};

/**
 * useUpdateBudget - optimistic update for a single budget
 * - updates both list and single-budget caches
 */
type UpdateVars = { id: string; payload: any };
type UpdateContext = {
  previous?: Budget[] | undefined;
  previousItem?: Budget | undefined;
};

export const useUpdateBudget = () => {
  const qc = useQueryClient();

  return useMutation<any, Error, UpdateVars, UpdateContext>({
    mutationFn: ({ id, payload }) => budgetService.updateBudget(id, payload),

    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });

      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);
      const previousItem = previous?.find((b) => b.id === id);

      if (previous) {
        const newData = previous.map((b) =>
          b.id === id
            ? {
                ...b,
                amount: payload.amount ?? b.amount,
                categoryId:
                  payload.categoryId !== undefined
                    ? payload.categoryId
                    : b.categoryId,
                ...(payload.category ? { category: payload.category } : {}),
              }
            : b,
        );
        qc.setQueryData<Budget[]>([queryKeys.budgets], newData);
      }

      // update single budget cache if present
      const singleKey = [queryKeys.budget, id];
      const prevSingle = qc.getQueryData<Budget | undefined>(singleKey);
      if (prevSingle) {
        qc.setQueryData<Budget>(singleKey, {
          ...prevSingle,
          amount: payload.amount ?? prevSingle.amount,
          categoryId:
            payload.categoryId !== undefined
              ? payload.categoryId
              : prevSingle.categoryId,
          ...(payload.category ? { category: payload.category } : {}),
        });
      }

      return { previous, previousItem };
    },

    onError: (err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData([queryKeys.budgets], context.previous);
      }
      if (context?.previousItem) {
        qc.setQueryData([queryKeys.budget, vars.id], context.previousItem);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.budget] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};

/**
 * useDeleteBudget - optimistic deletion
 */
export const useDeleteBudget = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, string, { previous?: Budget[] | undefined }>({
    mutationFn: (id) => budgetService.deleteBudget(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: [queryKeys.budgets] });
      const previous = qc.getQueryData<Budget[] | undefined>([
        queryKeys.budgets,
      ]);
      if (previous)
        qc.setQueryData<Budget[]>(
          [queryKeys.budgets],
          previous.filter((b) => b.id !== id),
        );
      qc.removeQueries({ queryKey: [queryKeys.budget, id] });
      return { previous };
    },

    onError: (err, id, context) => {
      if (context?.previous)
        qc.setQueryData([queryKeys.budgets], context.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.budgets] });
      qc.invalidateQueries({ queryKey: [queryKeys.reports] });
      qc.invalidateQueries({ queryKey: [queryKeys.expenses] });
    },
  });
};
