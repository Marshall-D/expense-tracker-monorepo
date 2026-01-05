// packages/client/src/hooks/useCategoryActions.ts
import { useCallback, useState, useRef } from "react";
import * as categoryService from "@/services";
import { t } from "@/lib";

/**
 * useCategoryActions
 *
 * Encapsulates modal/delete logic for categories.
 * - Accepts a `refetch` callback so it doesn't depend on a specific data layer.
 *
 * Returns:
 * - deleteModalOpen, deleteTarget: modal state
 * - deleting: id string | null (loading)
 * - requestDelete(id,name): open modal and set target
 * - performDelete(): actually call the delete service, shows toast, refetches
 * - cancelDelete(): close modal and clear state
 *
 */
export function useCategoryActions(options?: {
  // optional refetch callback from caller
  refetch?: () => Promise<unknown> | void;
}) {
  const { refetch } = options ?? {};

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // mounted ref to avoid updating state after unmount in async flows
  const mounted = useRef(true);
  // We set mounted.current = false in caller cleanup if necessary (caller can ignore)
  // For simplicity we keep this internal (no effect unless user wants to re-use across remounts)

  const requestDelete = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalOpen(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }, []);

  const performDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;

    setDeleting(id);
    try {
      await categoryService.deleteCategory(id);

      // friendly toast and refetch if provided
      t.success(`Category "${name}" deleted`);

      if (refetch) {
        // don't await if caller doesn't want to wait, but we will await to guarantee the UI updates consistently
        await Promise.resolve(refetch());
      }
    } catch (rawErr: any) {
      const err = rawErr || {};
      const friendly =
        err.friendlyMessage ??
        err.serverMessage ??
        err.message ??
        "Delete failed";
      console.error("delete category failed", rawErr);
      t.error(friendly, { duration: 7000 });
    } finally {
      if (mounted.current) {
        setDeleting(null);
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      }
    }
  }, [deleteTarget, refetch]);

  return {
    deleting,
    deleteModalOpen,
    deleteTarget,
    requestDelete,
    performDelete,
    cancelDelete,
  };
}
