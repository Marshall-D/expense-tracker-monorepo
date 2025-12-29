// packages/client/src/pages/expenses/ExpenseEditorPage.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ROUTES from "@/utils/routes";
import type { Expense, ExpenseCreatePayload } from "@/types/expense";
import { Button } from "@/components/ui/button";
import ExpenseForm from "./expenseForm";

/**
 * ExpenseEditorPage
 * - uses ExpenseForm which emits ExpenseCreatePayload
 * - when editing (id present) we call update flow (simulated here)
 * - when creating (no id) we call create flow (simulated here)
 *
 * NOTE: Replace the simulated API calls with real service hooks (e.g. useCreateExpense / useUpdateExpense)
 * when wiring to the backend.
 */

const DUMMY_EXPENSES: Record<string, Expense> = {
  "1": {
    id: "1",
    userId: "user-abc",
    amount: 2500,
    currency: "NGN",
    description: "Weekly Groceries",
    category: "Food",
    categoryId: "1",
    date: "2025-12-24",
    createdAt: "2025-12-24T12:00:00.000Z",
  },
  "2": {
    id: "2",
    userId: "user-abc",
    amount: 45.99,
    currency: "USD",
    description: "Movie Tickets",
    category: "Entertainment",
    categoryId: "3",
    date: "2025-12-23",
    createdAt: "2025-12-23T10:00:00.000Z",
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
        // ensure date is yyyy-mm-dd for the form
        setInitial({ ...found, date: found.date?.slice(0, 10) });
      } else {
        setError("Expense not found (dummy).");
      }
      setLoading(false);
    }, 400);

    return () => clearTimeout(t);
  }, [id]);

  // handleSubmit now accepts ExpenseCreatePayload (form emits this)
  const handleSubmit = async (payload: ExpenseCreatePayload) => {
    setError(null);
    setSaving(true);

    // simulate API call latency
    await new Promise((r) => setTimeout(r, 600));

    if (isNew) {
      // simulate backend returning new id
      const newId = String(Date.now());
      // In a real app you'd call createExpense(payload) and use response.id
      DUMMY_EXPENSES[newId] = {
        id: newId,
        userId: "user-abc",
        amount: payload.amount,
        currency: payload.currency ?? "NGN",
        description: payload.description ?? "",
        category: payload.category ?? "Uncategorized",
        categoryId: payload.categoryId ?? null,
        date: payload.date ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    } else {
      // update path (id exists)
      if (id && DUMMY_EXPENSES[id]) {
        DUMMY_EXPENSES[id] = {
          ...DUMMY_EXPENSES[id],
          amount: payload.amount,
          currency: payload.currency ?? DUMMY_EXPENSES[id].currency,
          description: payload.description ?? DUMMY_EXPENSES[id].description,
          categoryId: payload.categoryId ?? DUMMY_EXPENSES[id].categoryId,
          // optionally update category string if you resolve it
          date: payload.date ?? DUMMY_EXPENSES[id].date,
        };
      } else {
        setError("Unable to update: item not found.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    // navigate back to list (in real app you'd check response)
    navigate(ROUTES.EXPENSES);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this expense? This action cannot be undone.")) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 600));
    // simulate delete
    delete DUMMY_EXPENSES[id];
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
