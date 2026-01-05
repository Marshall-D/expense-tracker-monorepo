// packages/client/src/pages/categories/categories.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils";
import { useCategories, useCategoryActions } from "@/hooks";
import { InfoModal } from "@/components";
import { CategoriesList } from "./categoriesList";

/**
 * CategoriesPage (container)
 *
 * Responsible for:
 * - Data fetching (useCategories)
 * - Wiring category actions (useCategoryActions)
 * - Routing / navigation concerns
 *
 * Delegates rendering to CategoriesList (presentational).
 *
 */
export function CategoriesPage(): JSX.Element {
  const navigate = useNavigate();

  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useCategories(true);

  // action hook: handles delete modal + deletion side-effects
  const {
    deleting,
    deleteModalOpen,
    deleteTarget,
    requestDelete,
    performDelete,
    cancelDelete,
  } = useCategoryActions({ refetch });

  return (
    <>
      <CategoriesList
        categories={categories}
        isLoading={isLoading}
        isError={isError}
        deletingId={deleting}
        onNew={() => navigate(ROUTES.CATEGORIES_NEW)}
        onEdit={(id: string) => navigate(ROUTES.CATEGORIES_BY_ID(id))}
        onRequestDelete={requestDelete}
      />

      <InfoModal
        open={deleteModalOpen}
        title={
          deleteTarget ? `Delete "${deleteTarget.name}"?` : "Delete category?"
        }
        message="Deleting this category is permanent. Expenses already created with this category will not be deleted. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={Boolean(deleting)}
        onCancel={cancelDelete}
        onConfirm={performDelete}
      />
    </>
  );
}
