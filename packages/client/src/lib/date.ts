// packages/client/src/lib/date.ts
import { format } from "date-fns";

/**
 * monthLabel("2026-01") -> "Jan 2026"
 * Returns "—" when input null/invalid.
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
 * monthShort("2026-01") -> "Jan"
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
 * monthToRange("2026-01") => ["2026-01-01", "2026-01-31"]
 * - start is first day of month (UTC)
 * - end is last day of month (UTC)
 */
export function monthToRange(isoMonth: string): [string, string] {
  const [y, m] = isoMonth.split("-");
  const year = Number(y);
  const month = Number(m) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  // day 0 of next month -> last day of given month
  const end = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0));
  return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")];
}
