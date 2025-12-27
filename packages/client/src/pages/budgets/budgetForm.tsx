// packages/client/src/pages/budgets/BudgetForm.tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/types";

type Props = {
  initial?: Partial<Budget>;
  onSubmit: (payload: Budget) => Promise<void>;
  submitLabel?: string;
};

export default function BudgetForm({
  initial = {},
  onSubmit,
  submitLabel = "Save",
}: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [amount, setAmount] = useState(initial.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial.currency ?? "NGN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!categoryId) return setError("Choose a category");
    if (!parsed || parsed <= 0) return setError("Enter a valid amount");
    setLoading(true);
    try {
      await onSubmit({ amount: parsed, categoryId, currency });
    } catch (err: any) {
      setError(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{submitLabel} budget</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-md border border-border/20"
            >
              <option value="">-- select category --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 rounded-md"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div>
            <Button type="submit" className="rounded-full" disabled={loading}>
              {loading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
