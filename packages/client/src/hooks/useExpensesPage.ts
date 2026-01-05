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
  // URL state
  const [searchParams, setSearchParams] = useSearchParams();

  // initial values from URL (applied filters)
  const initialQ = searchParams.get("q") || "";
  const initialCategoryIds = (searchParams.get("categoryIds") || "")
    .split(",")
    .filter(Boolean);
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";
  const initialPage = Number(searchParams.get("page") || "1");

  // search
  const [searchTerm, setSearchTerm] = useState<string>(initialQ);

  // controlled filter inputs (working)
  const [workingCategoryIds, setWorkingCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [workingFrom, setWorkingFrom] = useState<string>(initialFrom);
  const [workingTo, setWorkingTo] = useState<string>(initialTo);

  // applied filters (used to query)
  const [appliedCategoryIds, setAppliedCategoryIds] =
    useState<string[]>(initialCategoryIds);
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>(
    initialFrom || undefined
  );
  const [appliedTo, setAppliedTo] = useState<string | undefined>(
    initialTo || undefined
  );

  // drawer open (mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // pagination
  const [page, setPage] = useState<number>(initialPage || 1);
  const limit = 50;

  // keep searchTerm in sync if URL changed externally
  useEffect(() => {
    setSearchTerm(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // Reset page to 1 whenever filters/search change
  useEffect(() => {
    setPage(1);
  }, [appliedCategoryIds.join(","), appliedFrom, appliedTo, searchTerm]);

  // Debounce helper (simple internal)
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // validation
  const dateRangeInvalid =
    Boolean(workingFrom && workingTo) && workingFrom > workingTo;

  // build params for useExpenses
  const params = useMemo(() => {
    const p: Record<string, any> = {
      q: debouncedSearch || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      limit,
      page,
    };
    if (appliedCategoryIds && appliedCategoryIds.length > 0) {
      p.categoryIds = appliedCategoryIds.join(",");
    }
    return p;
  }, [debouncedSearch, appliedFrom, appliedTo, appliedCategoryIds, page]);

  // data + mutations
  const expensesQuery = useExpenses(params);
  const categoriesQuery = useCategories(true);
  const deleteMutation = useDeleteExpense();
  const exportMutation = useExportExpenses();

  // derived
  const categories = categoriesQuery.data ?? [];
  const data = expensesQuery.data;
  const isLoading = expensesQuery.isLoading;
  const isFetching = (expensesQuery as any).isFetching ?? false;
  const isError = expensesQuery.isError ?? false;

  // delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // push applied filters + q + page into URL (shareable)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set("q", debouncedSearch);
    if (appliedCategoryIds && appliedCategoryIds.length > 0)
      qs.set("categoryIds", appliedCategoryIds.join(","));
    if (appliedFrom) qs.set("from", appliedFrom);
    if (appliedTo) qs.set("to", appliedTo);
    if (page && page > 1) qs.set("page", String(page));
    setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, appliedCategoryIds, appliedFrom, appliedTo, page]);

  // helpers
  const toggleCategory = useCallback((id: string) => {
    setWorkingCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Apply handler with strict validation (both or none)
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
    // let mutation hooks show toasts; show a UI toast here to confirm filter applied is okay.
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

  // delete flow (mutations handle toasts)
  const requestDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  }, []);

  const performDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      // hook already shows success toast
    } catch (err) {
      // hook will show onError toast; keep logging for dev
      console.error("delete failed", err);
    } finally {
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, deleteMutation]);

  // export CSV wiring: uses exportMutation (assumed to have toasts). We handle blob download here.
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
      // delegate to shared helper for converting resp -> file
      await downloadResponseAsFile(resp as any, fallbackFileName(from, to));
      // do NOT call t.success here — export hook already shows a toast on success
    } catch (err) {
      // export hook should show onError; keep console for debugging
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
    // reactive state + setters used by view
    // queries
    data,
    categories,
    isLoading,
    isFetching,
    isError,

    // search / filters
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

    // UI state
    drawerOpen,
    setDrawerOpen,
    dateRangeInvalid,

    // pagination
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

    // delete
    deleteModalOpen,
    setDeleteModalOpen,
    requestDelete,
    performDelete,
    deleteTargetId,

    // helpers
    toggleCategory,
    handleApply,
    handleClear,

    // export
    handleExport,
    isExporting: exportMutation.status === "pending",

    // mutations status
    isDeleting: deleteMutation.status === "pending",

    // categories query state
    categoriesLoading: categoriesQuery.isLoading,
    categoriesError: categoriesQuery.isError,
    refetchCategories: categoriesQuery.refetch,
  };
}
