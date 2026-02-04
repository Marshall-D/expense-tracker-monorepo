// packages/client/src/hooks/useExpensesPage.ts
/**
 * Encapsulate the state + handlers for the Expenses page.
 *
 * Responsibilities:
 * - read/write URL search params
 * - manage working/applied filters + drawer state
 * - pagination
 * - call hooks for data (useExpenses, useCategories)
 * - call mutation hooks (delete, export)
 * - expose a minimal presentational API to the view
 *
 */

/**
 * useExpensesPage - state and handlers for the Expenses page.
 * - reads/writes URL search params (shareable links)
 * - manages working/applied filters & pagination
 * - wires delete/export flows
 */

import { useMemo, useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";

import {
  useExpenses,
  useDeleteExpense,
  useCategories,
  useExportExpenses,
} from "@/hooks";
import { t, downloadResponseAsFile } from "@/lib";

export function useExpensesPage() {
  // read URL search params (shareable)
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const initialCategoryIds = (searchParams.get("categoryIds") || "")
    .split(",")
    .filter(Boolean);
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";
  const initialPage = Number(searchParams.get("page") || "1");

  // controlled UI state
  const [searchTerm, setSearchTerm] = useState<string>(initialQ);
  const [workingCategoryIds, setWorkingCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [workingFrom, setWorkingFrom] = useState<string>(initialFrom);
  const [workingTo, setWorkingTo] = useState<string>(initialTo);

  // applied (used for queries)
  const [appliedCategoryIds, setAppliedCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(
    initialFrom || undefined,
  );
  const [appliedTo, setAppliedTo] = useState<string | undefined>(
    initialTo || undefined,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [page, setPage] = useState<number>(initialPage || 1);
  const limit = 50;

  // sync searchTerm when URL changes externally
  useEffect(() => {
    setSearchTerm(initialQ);
  }, [initialQ]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [appliedCategoryIds.join(","), appliedFrom, appliedTo, searchTerm]);

  // simple debounce for searchTerm
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // validate date range
  const dateRangeInvalid =
    Boolean(workingFrom && workingTo) && workingFrom > workingTo;

  // build params for useExpenses query
  const params = useMemo(() => {
    const p: Record<string, any> = {
      q: debouncedSearch || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      limit,
      page,
    };
    if (appliedCategoryIds && appliedCategoryIds.length > 0)
      p.categoryIds = appliedCategoryIds.join(",");
    return p;
  }, [debouncedSearch, appliedFrom, appliedTo, appliedCategoryIds, page]);

  // data + mutations
  const expensesQuery = useExpenses(params);
  const categoriesQuery = useCategories(true);
  const deleteMutation = useDeleteExpense();
  const exportMutation = useExportExpenses();

  // derive values for view
  const categories = categoriesQuery.data ?? [];
  const data = expensesQuery.data;
  const isLoading = expensesQuery.isLoading;
  const isFetching = (expensesQuery as any).isFetching ?? false;
  const isError = expensesQuery.isError ?? false;

  // delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // push filters into URL whenever applied filters change
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set("q", debouncedSearch);
    if (appliedCategoryIds && appliedCategoryIds.length > 0)
      qs.set("categoryIds", appliedCategoryIds.join(","));
    if (appliedFrom) qs.set("from", appliedFrom);
    if (appliedTo) qs.set("to", appliedTo);
    if (page && page > 1) qs.set("page", String(page));
    setSearchParams(qs, { replace: true });
  }, [debouncedSearch, appliedCategoryIds, appliedFrom, appliedTo, page]);

  const toggleCategory = useCallback((id: string) => {
    setWorkingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleApply = useCallback(() => {
    const fromSet = Boolean(workingFrom && workingFrom.trim());
    const toSet = Boolean(workingTo && workingTo.trim());
    if ((fromSet && !toSet) || (!fromSet && toSet)) {
      t.error("Please fill both From and To, or leave both empty.");
      return;
    }
    if (fromSet && toSet && workingFrom! > workingTo!) {
      t.error("Invalid range: 'From' must be before or equal to 'To'.");
      return;
    }
    setAppliedCategoryIds(workingCategoryIds);
    setAppliedFrom(workingFrom || undefined);
    setAppliedTo(workingTo || undefined);
    setDrawerOpen(false);
    t.success("Filters applied");
  }, [workingCategoryIds, workingFrom, workingTo]);

  const handleClear = useCallback(() => {
    setWorkingCategoryIds([]);
    setWorkingFrom("");
    setWorkingTo("");
    setAppliedCategoryIds([]);
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setDrawerOpen(false);
    t.success("Filters cleared");
  }, []);

  const requestDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  }, []);
  const performDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
    } catch (err) {
      console.error("delete failed", err);
    } finally {
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, deleteMutation]);

  // Export CSV helpers - fallback range is last 90 days
  function defaultRange() {
    const today = new Date();
    const to = format(today, "yyyy-MM-dd");
    const fromDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const from = format(fromDate, "yyyy-MM-dd");
    return { from, to };
  }
  function fallbackFileName(fromStr: string, toStr: string) {
    return `expenses_${fromStr}_${toStr}.csv`;
  }

  const handleExport = useCallback(async () => {
    const { from: defFrom, to: defTo } = defaultRange();
    const from = appliedFrom || defFrom;
    const to = appliedTo || defTo;

    try {
      const resp = await exportMutation.mutateAsync({ from, to });
      await downloadResponseAsFile(resp as any, fallbackFileName(from, to));
    } catch (err) {
      console.error("Export failed", err);
    }
  }, [appliedFrom, appliedTo, exportMutation]);

  // pagination derived
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const endIndex = total === 0 ? 0 : startIndex + (data?.data?.length ?? 0) - 1;
  const hasPrev = currentPage > 1;
  const hasNext = endIndex < total;

  return {
    data,
    categories,
    isLoading,
    isFetching,
    isError,
    searchTerm,
    setSearchTerm,
    workingCategoryIds,
    setWorkingCategoryIds,
    workingFrom,
    setWorkingFrom,
    workingTo,
    setWorkingTo,
    appliedCategoryIds,
    appliedFrom,
    appliedTo,
    drawerOpen,
    setDrawerOpen,
    dateRangeInvalid,
    page,
    setPage,
    limit,
    total,
    currentPage,
    currentLimit,
    startIndex,
    endIndex,
    hasPrev,
    hasNext,
    deleteModalOpen,
    setDeleteModalOpen,
    requestDelete,
    performDelete,
    deleteTargetId,
    toggleCategory,
    handleApply,
    handleClear,
    handleExport,
    isExporting: exportMutation.status === "pending",
    isDeleting: deleteMutation.status === "pending",
    categoriesLoading: categoriesQuery.isLoading,
    categoriesError: categoriesQuery.isError,
    refetchCategories: categoriesQuery.refetch,
  };
}
