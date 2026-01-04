// packages/client/src/services/reportService.ts
/**
 * Thin wrappers for reporting endpoints.
 *
 * Responsibilities:
 *  - Keep service layer tiny and typed
 *  - Do not perform heavy transformations — leave that to UI components
 *
 * This file intentionally contains only simple fetch functions.
 */

import { api } from "@/lib";
import {
  ByCategoryResponse,
  MonthlyReportResponse,
  TrendsResponse,
} from "@/types";

/**
 * Fetch N months of trends. Server expects `months` as number.
 */
export const fetchTrends = async (months = 6): Promise<TrendsResponse> => {
  const resp = await api.get<TrendsResponse>("/api/reports/trends", {
    params: { months },
  });
  return resp.data as TrendsResponse;
};

export const fetchMonthlyReport = async (
  year: number,
  month: number
): Promise<MonthlyReportResponse> => {
  const resp = await api.get<MonthlyReportResponse>("/api/reports/monthly", {
    params: { year: String(year), month: String(month) },
  });
  return resp.data as MonthlyReportResponse;
};

export const fetchByCategory = async (
  from: string,
  to: string
): Promise<ByCategoryResponse> => {
  const resp = await api.get<ByCategoryResponse>("/api/reports/by-category", {
    params: { from, to },
  });
  return resp.data as ByCategoryResponse;
};

/**
 * Export expenses as a CSV blob. Caller must handle downloading.
 * Returns the raw axios response (with headers) so the UI can extract file name.
 */
export const exportExpenses = async (from: string, to: string) => {
  const resp = await api.get("/api/export/expenses", {
    params: { from, to, format: "csv" },
    responseType: "blob",
  });
  return resp;
};
