// packages/client/src/hooks/useBudgetsData.ts
/**
 * useBudgetsData
 *
 * Composes existing data hooks and mutations for the Budgets screen and
 * exposes a small, well-typed shape for the presentational view.
 *
 * Responsibilities:
 * - fetch list of budgets
 * - handle deletion (modal + optimistic flow via useDeleteBudget)
 * - expose lightweight handlers (requestDelete, cancelDelete, confirmDelete)
 *
 */

import { useState, useCallback } from "react";

import { useBudgets, useDeleteBudget } from "@/hooks";
import type { UseBudgetsDataResult } from "@/types";
import { t } from "@/lib";

export function useBudgetsData(): UseBudgetsDataResult {
  // fetch budgets list (existing hook)
  const { data: budgets = [], isLoading, isError } = useBudgets();

  // delete mutation (existing hook)
  const deleteMutation = useDeleteBudget();
  const isDeleting = deleteMutation.status === "pending";

  // local UI state: modal + selected target
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    category: string;
  } | null>(null);

  // request to delete: open modal and store lightweight metadata
  const requestDelete = useCallback((id: string, category: string) => {
    setDeleteTarget({ id, category });
    setDeleteModalOpen(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }, []);

  // confirm deletion: call mutation and show fallback toasts
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const category = deleteTarget.category;
    try {
      await deleteMutation.mutateAsync(id);
      t.success(`Budget for ${category} deleted`);
    } catch (err: any) {
      t.error(err?.message ?? "Delete failed");
      throw err;
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  return {
    budgets,
    isLoading,
    isError,

    deleteModalOpen,
    deleteTarget,

    requestDelete,
    cancelDelete,
    confirmDelete,

    isDeleting,
  };
}
