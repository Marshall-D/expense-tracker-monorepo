// packages/client/src/hooks/useBudgetSpending.ts
/**
 * useBudgetSpending
 * - calculates total spent for a budget (category + periodStart)
 * - composes an expenses fetch and reduces amounts
 */

import { useQuery } from "@tanstack/react-query";
import * as expensesService from "@/services";
import { queryKeys } from "@/lib";

type Args = {
  categoryId?: string | null;
  category?: string | null;
  periodStart: string;
};

export const useBudgetSpending = ({
  categoryId,
  category,
  periodStart,
}: Args) => {
  // Normalize periodStart -> fromIso / toIso (UTC month boundaries)
  const getRange = (periodStartStr: string) => {
    const maybeIso =
      periodStartStr.length === 7 ? `${periodStartStr}-01` : periodStartStr;
    const p = new Date(maybeIso);
    if (Number.isNaN(p.getTime())) {
      // fallback to current month range if invalid
      const now = new Date();
      return {
        fromIso: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        ).toISOString(),
        toIso: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        ).toISOString(),
      };
    }
    const year = p.getUTCFullYear();
    const month = p.getUTCMonth();
    const from = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  };

  const { fromIso, toIso } = getRange(periodStart);

  const qKey = [
    queryKeys.budgets,
    "spending",
    categoryId ?? category ?? "uncategorized",
    String(fromIso).slice(0, 7),
  ] as const;

  return useQuery<number>({
    queryKey: qKey,
    queryFn: async () => {
      const params: Record<string, any> = {
        from: fromIso,
        to: toIso,
        limit: 1000,
      };
      if (categoryId) params.categoryId = categoryId;
      else if (category) params.category = category;

      const resp = await expensesService.fetchExpenses(params);
      const expenseItems: any[] = Array.isArray((resp as any).data)
        ? (resp as any).data
        : [];

      const spent = expenseItems.reduce(
        (acc, e) => acc + (Number(e.amount) || 0),
        0,
      );
      return spent;
    },
    staleTime: 1000 * 30,
  });
};
