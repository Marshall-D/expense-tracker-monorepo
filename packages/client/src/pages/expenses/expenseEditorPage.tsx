// packages/client/src/pages/expenses/ExpenseEditorPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/utils";
import type { ExpenseCreatePayload, Expense } from "@/types";
import { Button, InfoModal } from "@/components";
import { ExpenseForm } from "./expenseForm";
import {
  useCreateExpense,
  useExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/hooks";

export function ExpenseEditorPage(): JSX.Element {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const expenseQuery = useExpense(id);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [error, setError] = useState<string | null>(null);
  const loading = isNew ? false : expenseQuery.isLoading;

  const isCreating = createMutation.status === "pending";
  const isUpdating = updateMutation.status === "pending";
  const isDeleting = deleteMutation.status === "pending";

  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = useMemo<Partial<Expense> | undefined>(() => {
    if (!expenseQuery.data) return undefined;
    const e = expenseQuery.data;
    return { ...e, date: e.date ? e.date.slice(0, 10) : undefined };
  }, [expenseQuery.data]);

  useEffect(() => {
    if (!isNew && expenseQuery.isError) {
      setError("Failed to load expense.");
    }
  }, [isNew, expenseQuery.isError]);

  const handleSubmit = async (payload: ExpenseCreatePayload) => {
    setError(null);
    try {
      if (isNew) {
        await createMutation.mutateAsync(payload);
        // mutation hook shows toast; navigate back
        navigate(ROUTES.EXPENSES);
      } else {
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, payload });
        navigate(ROUTES.EXPENSES);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Save failed";
      // show inline error; do NOT call t.error here (hooks handle toasts)
      setError(msg);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      setConfirmOpen(false);
      navigate(ROUTES.EXPENSES);
    } catch (err: any) {
      const msg = err?.message ?? "Delete failed";
      setError(msg);
    }
  };

  if (loading) return <div>Loading expense…</div>;
  if (!isNew && error)
    return <div className="text-sm text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "Add Expense" : "Edit Expense"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? "Record a new spending." : "Update expense details."}
          </p>
        </div>

        {!isNew && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.EXPENSES)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <ExpenseForm
        initial={initial}
        submitLabel={isNew ? "Add Expense" : "Save changes"}
        onSubmit={handleSubmit}
      />

      <InfoModal
        open={confirmOpen}
        title="Delete expense?"
        message="This action will permanently delete the expense. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
