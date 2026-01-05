// packages/client/src/components/budgetCard.tsx
/**
 * BudgetCard
 *
 * - Shows budget summary (category, period, amount)
 * - Shows spent vs limit with a progress bar
 * - When spent > amount the filled bar is shown fully and colored black to indicate "over budget"
 * - Handles loading states from useBudgetSpending
 *
 */

import React from "react";
import { Link } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components";
import { Pencil, Trash2, Wallet, AlertCircle } from "lucide-react";
import { ROUTES } from "@/utils";
import type { Budget } from "@/types";
import { useBudgetSpending } from "@/hooks";
import { formatNGN } from "@/lib/number";

type Props = {
  budget: Budget;
  onDelete: (id: string, category: string) => void;
  isDeleting: boolean;
};

/**
 * clamp used only for width of the inner filled bar (0..100)
 */
function clampToWidth(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Format displayed percentage. When >100 we display "≥100%".
 */
function displayPercent(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return "≥100%";
  return `${Math.round(n)}%`;
}

export function BudgetCard({ budget, onDelete, isDeleting }: Props) {
  // fetch spent total for the budget month/category
  const { data: spent = 0, isLoading } = useBudgetSpending({
    categoryId: budget.categoryId ?? undefined,
    category: budget.category ?? undefined,
    periodStart: budget.periodStart,
  });

  // defensive parsing of amount & spent
  const amount = Number(budget.amount ?? 0);
  const spentValue = Number(isLoading ? 0 : (spent ?? 0));

  // raw percentage (may be >100)
  const rawPercent = amount > 0 ? (spentValue / amount) * 100 : 0;
  const fillPercent = clampToWidth(rawPercent);

  // overspend condition: spent strictly greater than amount
  const isOverBudget = amount > 0 ? spentValue > amount : false;

  // progress bar color: black when overspent, green otherwise
  const filledColorClass = isOverBudget ? "bg-black" : "bg-emerald-500";

  // accessible label for progress bar
  const progressLabel = isLoading
    ? "Loading spending"
    : isOverBudget
      ? `Over budget — ${formatNGN(spentValue)} spent of ${formatNGN(amount)}`
      : `${formatNGN(spentValue)} spent of ${formatNGN(amount)}`;

  // overage amount for message
  const overageAmount = isOverBudget ? spentValue - amount : 0;

  return (
    <Card className="border-border/40 bg-card/40 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-lg">
                {budget.category ?? "Uncategorized"}
              </CardTitle>
              <CardDescription>Monthly limit</CardDescription>
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <Link to={ROUTES.BUDGETS_BY_ID(budget.id!)}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive/70"
              disabled={isDeleting}
              onClick={() =>
                onDelete(budget.id!, budget.category ?? "Uncategorized")
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Top row: numeric spent / limit and percentage */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-2xl font-bold">
              {isLoading ? "—" : formatNGN(spentValue)}
            </span>
            <span className="text-muted-foreground text-sm ml-2">
              of {formatNGN(amount)}
            </span>
          </div>

          <span
            className={`text-sm font-bold ${
              isOverBudget ? "text-destructive" : "text-emerald-500"
            }`}
          >
            {isNaN(rawPercent) ? "—" : displayPercent(rawPercent)}
          </span>
        </div>

        {/* Custom progress bar: container + filled segment.
           
        */}
        <div
          className="h-2 rounded-full bg-border/40 overflow-hidden"
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={isLoading ? 0 : fillPercent}
        >
          {/* filled portion */}
          <div
            className={`${filledColorClass} h-full transition-all`}
            style={{
              width: `${isLoading ? 8 : fillPercent}%`,
              minWidth: isLoading ? undefined : undefined,
            }}
          />
        </div>

        {/* Warning / overage block */}
        {isOverBudget && (
          <div className="flex items-center gap-2 text-xs text-destructive mt-3 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
            <AlertCircle className="h-3 w-3" />
            <div>
              <div className="font-medium">
                You've exceeded this budget by {formatNGN(overageAmount)}.
              </div>
              <div className="text-muted-foreground">
                Spent {formatNGN(spentValue)} of {formatNGN(amount)}.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
