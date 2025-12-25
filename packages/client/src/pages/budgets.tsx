// src/pages/budgets.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Wallet, AlertCircle } from "lucide-react";

const dummyBudgets = [
  {
    id: "1",
    category: "Food",
    amount: 50000,
    spent: 32000,
    currency: "NGN",
    color: "var(--chart-1)",
  },
  {
    id: "2",
    category: "Transport",
    amount: 15000,
    spent: 14500,
    currency: "NGN",
    color: "var(--chart-2)",
  },
  {
    id: "3",
    category: "Entertainment",
    amount: 200,
    spent: 45,
    currency: "USD",
    color: "var(--chart-3)",
  },
  {
    id: "4",
    category: "Utilities",
    amount: 25000,
    spent: 12000,
    currency: "NGN",
    color: "var(--chart-4)",
  },
];

export default function BudgetsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Set spending limits and track category performance.
          </p>
        </div>
        <Button size="sm" className="rounded-full gap-2">
          <Plus className="h-4 w-4" /> Set Budget
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {dummyBudgets.map((budget) => {
          const percentage = (budget.spent / budget.amount) * 100;
          const isOverBudget = percentage >= 90;

          return (
            <Card
              key={budget.id}
              className="border-border/40 bg-card/40 overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                      style={{ color: budget.color }}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {budget.category}
                      </CardTitle>
                      <CardDescription>Monthly limit</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-2xl font-bold">
                      {budget.currency === "USD" ? "$" : "₦"}
                      {budget.spent.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      of {budget.currency === "USD" ? "$" : "₦"}
                      {budget.amount.toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      isOverBudget ? "text-destructive" : "text-emerald-500"
                    }`}
                  >
                    {percentage.toFixed(0)}%
                  </span>
                </div>

                <Progress value={percentage} className="h-2 mb-2" />

                {isOverBudget && (
                  <div className="flex items-center gap-2 text-xs text-destructive mt-3 bg-destructive/10 p-2 rounded-lg border border-destructive/20 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    Warning: You've reached {percentage.toFixed(0)}% of your{" "}
                    {budget.category} budget.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
