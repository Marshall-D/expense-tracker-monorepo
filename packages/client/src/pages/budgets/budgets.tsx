// packages/client/src/pages/budgets/budgets.tsx
/**
 * BudgetsPage (container)
 *
 */

import React from "react";
import { useBudgetsData } from "@/hooks";
import { BudgetsView } from "./budgetsView";

/**
 * Exported page component used by routes.
 */
export function BudgetsPage(): JSX.Element {
  const data = useBudgetsData();
  return <BudgetsView {...data} />;
}
