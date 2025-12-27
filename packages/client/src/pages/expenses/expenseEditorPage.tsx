// packages/client/src/pages/expenses/ExpenseEditorPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ROUTES from "@/utils/routes";
import type { Expense } from "@/types";
import { Button } from "@/components/ui/button";
import ExpenseForm from "./expenseForm";

const DUMMY_EXPENSES: Record<string, Expense> = {
  "1": {
    id: "1",
    amount: 2500,
    currency: "NGN",
    description: "Weekly Groceries",
    categoryId: "1",
    date: "2025-12-24",
  },
  "2": {
    id: "2",
    amount: 45.99,
    currency: "USD",
    description: "Movie Tickets",
    categoryId: "3",
    date: "2025-12-23",
  },
};

export default function ExpenseEditorPage(): JSX.Element {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [initial, setInitial] = useState<Partial<Expense> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitial(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(() => {
      const found = DUMMY_EXPENSES[id];
      if (found) {
        // ensure date is yyyy-mm-dd
        setInitial({ ...found, date: found.date?.slice(0, 10) });
      } else {
        setError("Expense not found (dummy).");
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(t);
  }, [id]);

  const handleSubmit = async (payload: Expense) => {
    setError(null);
    setSaving(true);
    // simulate API save latency
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    // navigate back to list (in real app you'd check response)
    navigate(ROUTES.EXPENSES);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this expense? This action cannot be undone.")) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 600));
    setDeleting(false);
    navigate(ROUTES.EXPENSES);
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
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
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
