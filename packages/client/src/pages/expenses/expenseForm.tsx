// packages/client/src/pages/expenses/ExpenseForm.tsx
import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Expense, ExpenseCreatePayload } from "@/types/expense";
import { useCategories } from "@/hooks/useCategories";

type Props = {
  initial?: Partial<Expense>;
  onSubmit: (payload: ExpenseCreatePayload) => Promise<void>;
  submitLabel?: string;
};

export default function ExpenseForm({
  initial = {},
  onSubmit,
  submitLabel = "Save",
}: Props) {
  const touchedRef = useRef(false);

  const [amount, setAmount] = useState<string>(
    initial.amount?.toString() ?? ""
  );
  const [currency, setCurrency] = useState(initial.currency ?? "NGN");
  const [description, setDescription] = useState(initial.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    initial.categoryId ?? ""
  );
  const [date, setDate] = useState(
    initial.date ?? new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories(true);

  // Sync local state when `initial` prop changes, but only if user hasn't interacted yet.
  useEffect(() => {
    if (!initial || Object.keys(initial).length === 0) {
      return;
    }
    if (touchedRef.current) {
      return;
    }

    setAmount(initial.amount?.toString() ?? "");
    setCurrency(initial.currency ?? "NGN");
    setDescription(initial.description ?? "");
    setCategoryId(initial.categoryId ?? "");
    setDate(initial.date ?? new Date().toISOString().slice(0, 10));
  }, [initial]);

  // mark touched when user changes each field
  const onAmountChange = (val: string) => {
    touchedRef.current = true;
    setAmount(val);
  };
  const onCurrencyChange = (val: string) => {
    touchedRef.current = true;
    setCurrency(val);
  };
  const onDescriptionChange = (val: string) => {
    touchedRef.current = true;
    setDescription(val);
  };
  const onCategoryChange = (val: string) => {
    touchedRef.current = true;
    setCategoryId(val);
  };
  const onDateChange = (val: string) => {
    touchedRef.current = true;
    setDate(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    setLoading(true);
    try {
      const payload: ExpenseCreatePayload = {
        amount: parsed,
        currency,
        description,
        categoryId,
        date,
      };
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message ?? "Failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{submitLabel} expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                required
                className="bg-background/50"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <div className="flex items-center gap-2">
              <select
                id="category"
                value={categoryId}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
                disabled={categoriesLoading}
              >
                {categoriesLoading ? (
                  <option value="">Loading categories…</option>
                ) : categoriesError ? (
                  <option value="">Failed to load categories</option>
                ) : (
                  <>
                    <option value="">-- select category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </>
                )}
              </select>

              {categoriesError && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchCategories()}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/20 bg-background/50 p-2"
              placeholder="e.g. Weekly groceries"
            />
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex gap-2">
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading || categoriesLoading}
            >
              {loading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
