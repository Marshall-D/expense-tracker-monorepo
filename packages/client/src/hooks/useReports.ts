// packages/client/src/hooks/useReports.ts

import { useQuery, useMutation } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import * as reportService from "@/services";
import { queryKeys, t } from "@/lib";

/** useTrends - fetch last N months trends */
export const useTrends = (months = 6) =>
  useQuery({
    queryKey: [queryKeys.reports, "trends", { months }],
    queryFn: () => reportService.fetchTrends(months),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });

/** useMonthlyReport */
export const useMonthlyReport = (year: number, month: number) =>
  useQuery({
    queryKey: [queryKeys.reports, "monthly", { year, month }],
    queryFn: () => reportService.fetchMonthlyReport(year, month),
    staleTime: 1000 * 60 * 5,
  });

/** useCategoryReport */
export const useCategoryReport = (from: string, to: string) =>
  useQuery({
    queryKey: [queryKeys.reports, "byCategory", { from, to }],
    queryFn: () => reportService.fetchByCategory(from, to),
    staleTime: 1000 * 60 * 5,
  });

/** useExportExpenses - mutation that triggers CSV export (file download handled by caller) */
export const useExportExpenses = () =>
  useMutation<any, Error, { from: string; to: string }>({
    mutationFn: async (vars) => {
      const resp = await reportService.exportExpenses(vars.from, vars.to);
      return resp;
    },
    onMutate: () => {
      t.loading("Preparing CSV…");
    },
    onSuccess: (data) => {
      t.dismiss();
      t.success("CSV ready — starting download");
    },
    onError: (err: any) => {
      t.dismiss();
      const msg =
        (err && (err.response?.data?.message || err.message)) ||
        "Export failed";
      t.error(msg, { duration: 7000 });
    },
  });
