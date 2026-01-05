// packages/client/src/pages/expenses/expenses.tsx
import React, { Suspense } from "react";
import { ExpensesView } from "./expensesView";
import { useExpensesPage } from "@/hooks";

export function ExpensesPageWrapper() {
  const state = useExpensesPage();
  return (
    <Suspense fallback={null}>
      <ExpensesView {...state} />
    </Suspense>
  );
}
