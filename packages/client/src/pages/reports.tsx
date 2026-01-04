/**
 * packages/client/src/pages/reports.tsx

 */

import React, { useMemo, useState, useEffect } from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Download } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components";
import { useTrends, useCategoryReport, useExportExpenses } from "@/hooks";

import {
  monthLabel,
  monthShort,
  monthToRange,
  downloadResponseAsFile,
} from "@/lib";

/** small responsive helper used locally */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.innerWidth < breakpoint
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export function ReportsPage() {
  const monthsAgo = 6;
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  const availableMonths = useMemo(
    () => trendsData?.months?.map((m) => m.month) ?? [],
    [trendsData]
  );

  const now = new Date();
  const currentIsoMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  useEffect(() => {
    if (selectedMonth) return;
    const latest =
      trendsData?.months && trendsData.months.length
        ? trendsData.months[trendsData.months.length - 1].month
        : currentIsoMonth;
    setSelectedMonth(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendsData]);

  const trendChartData = useMemo(() => {
    return (
      trendsData?.months?.map((m) => ({
        name: monthLabel(m.month),
        usd: m.totalUSD ?? 0,
        ngn: m.totalNGN ?? 0,
      })) ?? []
    );
  }, [trendsData]);

  const selMonth =
    selectedMonth ??
    availableMonths[availableMonths.length - 1] ??
    currentIsoMonth;
  const [from, to] = useMemo(() => monthToRange(selMonth), [selMonth]);

  const { data: categoryResp, isLoading: categoryLoading } = useCategoryReport(
    from,
    to
  );

  const byCategoryData = useMemo(() => {
    return (
      categoryResp?.byCategory?.map((r, i) => ({
        name: r.category,
        totalUSD: r.totalUSD ?? 0,
        totalNGN: r.totalNGN ?? 0,
        totalAll: (r.totalUSD ?? 0) + (r.totalNGN ?? 0),
        color: `var(--chart-${(i % 5) + 1})`,
      })) ?? []
    );
  }, [categoryResp]);

  const exportMutation = useExportExpenses();
  const isExporting = exportMutation.status === "pending";

  function fallbackFileName(fromStr: string, toStr: string) {
    return `expenses_${fromStr}_${toStr}.csv`;
  }

  const handleDownload = async () => {
    try {
      const resp = await exportMutation.mutateAsync({ from, to });
      await downloadResponseAsFile(resp as any, fallbackFileName(from, to));
    } catch (err: any) {
      console.error("Export failed", err);
    }
  };

  const isMobile = useIsMobile(768);
  const axisTickColor = "oklch(0.7 0.01 260)";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Spending Reports
          </h1>
          <p className="text-muted-foreground">
            In-depth analysis of your financial performance over time.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            className="rounded-full gap-2"
            onClick={handleDownload}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />{" "}
            {isExporting ? "Downloading…" : "Download CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/40 bg-card/40">
          <CardHeader>
            <div>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>
                Totals by currency across the last {monthsAgo} months.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="h-[350px]">
            {trendsLoading ? (
              <div className="p-6">Loading trends…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="gUSD" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.12}
                      />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gNGN" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.12}
                      />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.02 260)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="ngn"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gNGN)"
                  />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gUSD)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/40 bg-card/40">
          <CardHeader>
            {/* MOBILE: stacked header  */}
            <div className="sm:hidden w-full space-y-2">
              <div>
                <CardTitle>Spending by Category</CardTitle>
              </div>
              <div>
                <CardDescription>
                  Top categories for{" "}
                  <span className="font-medium">{monthLabel(selMonth)}</span>
                </CardDescription>
              </div>
              <div>
                <select
                  aria-label="Select month"
                  value={selMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 rounded-md border border-border/20 bg-background/60 px-2 text-sm w-full"
                >
                  {(availableMonths.length
                    ? availableMonths
                    : [currentIsoMonth]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {monthShort(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TABLET/DESKTOP */}
            <div className="hidden sm:flex items-start justify-between w-full">
              <div>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                  Top categories for{" "}
                  <span className="font-medium">{monthLabel(selMonth)}</span>
                </CardDescription>
              </div>

              <div className="ml-auto">
                <select
                  aria-label="Select month"
                  value={selMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 rounded-md border border-border/20 bg-background/60 px-2 text-sm"
                >
                  {(availableMonths.length
                    ? availableMonths
                    : [currentIsoMonth]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {monthShort(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent
            className={`h-[420px] md:h-[350px] ${isMobile ? "pb-24" : ""}`}
          >
            {categoryLoading ? (
              <div className="p-6">Loading categories…</div>
            ) : byCategoryData.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No category data for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategoryData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: axisTickColor,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    width={isMobile ? 120 : 140}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.02 260)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                  <Bar dataKey="totalAll" radius={[0, 4, 4, 0]} barSize={20}>
                    {byCategoryData.map((entry, idx) => (
                      <Cell key={entry.name + idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
