// packages/client/src/hooks/useBudgetsData.ts

/**
 * Composed hook for the Budgets screen.
 * - consumes useBudgets and useDeleteBudget
 * - exposes view-friendly handlers and state: requestDelete/confirmDelete/cancelDelete
 */

import { useState, useCallback } from "react";
import { useBudgets, useDeleteBudget } from "@/hooks";
import type { UseBudgetsDataResult } from "@/types";
import { t } from "@/lib";

export function useBudgetsData(): UseBudgetsDataResult {
  const { data: budgets = [], isLoading, isError } = useBudgets();
  const deleteMutation = useDeleteBudget();
  const isDeleting = deleteMutation.status === "pending";

  // modal state + selected item
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    category: string;
  } | null>(null);

  // open modal and set target
  const requestDelete = useCallback((id: string, category: string) => {
    setDeleteTarget({ id, category });
    setDeleteModalOpen(true);
  }, []);

  // cancel flow
  const cancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }, []);

  // confirm and call mutation
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
