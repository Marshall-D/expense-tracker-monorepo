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

/**
 * Reports page: visualize trends and by-category breakdowns.
 */

export function ReportsPage() {
  // trends window: fixed to last 6 months
  const monthsAgo = 6;

  // fetch trends for last N months
  const { data: trendsData, isLoading: trendsLoading } = useTrends(monthsAgo);

  // build available months list (oldest -> newest) from trends
  const availableMonths = useMemo(
    () => trendsData?.months?.map((m) => m.month) ?? [],
    [trendsData]
  );

  // fallback current month if trends missing
  const now = new Date();
  const currentIsoMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // selected month used by the "Spending by Category" chart
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // initialize selectedMonth to latest month when trends arrive
  useEffect(() => {
    if (selectedMonth) return;
    const latest =
      trendsData?.months && trendsData.months.length
        ? trendsData.months[trendsData.months.length - 1].month
        : currentIsoMonth;
    setSelectedMonth(latest);
  }, [trendsData]);

  // trends chart data (map months -> labels & totals)
  const trendChartData = useMemo(() => {
    return (
      trendsData?.months?.map((m) => ({
        name: monthLabel(m.month),
        usd: m.totalUSD ?? 0,
        ngn: m.totalNGN ?? 0,
      })) ?? []
    );
  }, [trendsData]);

  // determine date range for the selected month (fallback to current)
  const selMonth =
    selectedMonth ??
    availableMonths[availableMonths.length - 1] ??
    currentIsoMonth;
  const [from, to] = useMemo(() => monthToRange(selMonth), [selMonth]);

  // category report for selected month
  const { data: categoryResp, isLoading: categoryLoading } = useCategoryReport(
    from,
    to
  );

  // by-category chart data
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

  // export mutation (shows toast via hook)
  const exportMutation = useExportExpenses();
  const isExporting = exportMutation.status === "pending";

  // helper fallback filename
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
                    tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }}
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
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                Top categories for{" "}
                <span className="font-medium">{monthLabel(selMonth)}</span>
              </CardDescription>
            </div>

            {/* Month selector inside the card (uses months from trends) */}
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
          </CardHeader>

          <CardContent className="h-[350px]">
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
                      fill: "oklch(0.95 0.01 260)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    width={140}
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
