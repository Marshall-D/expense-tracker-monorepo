/**
 * packages/client/src/lib/date.ts
 *
 * Small focused date utilities used by reports/exports.
 */

import { format } from "date-fns";

/**
 * Convert an ISO month string "YYYY-MM" into a human label "Jan 2026".
 * Returns a readable fallback on error.
 */
export function monthLabel(isoMonth: string | null): string {
  if (!isoMonth) return "—";
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM yyyy");
  } catch {
    return String(isoMonth);
  }
}

/**
 * Short month label "MMM" for compact selectors.
 */
export function monthShort(isoMonth: string | null): string {
  if (!isoMonth) return "—";
  try {
    const [y, m] = isoMonth.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMM");
  } catch {
    return String(isoMonth);
  }
}

/**
 * Convert an ISO month "YYYY-MM" to a canonical inclusive start -> end range string pair
 * suitable for server query params (YYYY-MM-DD).
 *
 * Returned tuple: [from, to]
 *
 * Note: end is the last day of the month (yyyy-mm-dd).
 */
export function monthToRange(isoMonth: string): [string, string] {
  const [y, m] = isoMonth.split("-");
  const year = Number(y);
  const month = Number(m) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  // last day of month: using day 0 of next month yields last day of current month
  const end = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0));
  return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")];
}
