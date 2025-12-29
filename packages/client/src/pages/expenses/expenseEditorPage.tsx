// packages/client/src/pages/expenses/ExpenseEditorPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ROUTES from "@/utils/routes";
import type { ExpenseCreatePayload, Expense } from "@/types/expense";
import { Button } from "@/components/ui/button";
import ExpenseForm from "./expenseForm";
import {
  useCreateExpense,
  useExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/hooks/useExpenses";

export default function ExpenseEditorPage(): JSX.Element {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  // data hooks
  const expenseQuery = useExpense(id);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [error, setError] = useState<string | null>(null);
  const loading = isNew ? false : expenseQuery.isLoading;

  // derive booleans using status (type-safe)
  const isCreating = createMutation.status === "pending";
  const isUpdating = updateMutation.status === "pending";
  const isDeleting = deleteMutation.status === "pending";

  // map fetched expense to initial form shape (Partial<Expense>)
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
        // optimistic updates handled in hook; navigate to list
        navigate(ROUTES.EXPENSES);
      } else {
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, payload });
        navigate(ROUTES.EXPENSES);
      }
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this expense? This action cannot be undone.")) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      navigate(ROUTES.EXPENSES);
    } catch (err: any) {
      setError(err?.message ?? "Delete failed");
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
              onClick={handleDelete}
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
    </div>
  );
}
