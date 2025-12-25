// src/pages/dashboard.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Cell,
//   PieChart,
//   Pie,
// } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const monthlyData = [
  { month: "Jul", amount: 4500 },
  { month: "Aug", amount: 5200 },
  { month: "Sep", amount: 4800 },
  { month: "Oct", amount: 6100 },
  { month: "Nov", amount: 5500 },
  { month: "Dec", amount: 6700 },
];

const categoryData = [
  { name: "Housing", value: 2500, color: "var(--chart-1)" },
  { name: "Food", value: 1200, color: "var(--chart-2)" },
  { name: "Transport", value: 800, color: "var(--chart-3)" },
  { name: "Entertainment", value: 600, color: "var(--chart-4)" },
  { name: "Others", value: 400, color: "var(--chart-5)" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Financial Overview
        </h1>
        <p className="text-muted-foreground">
          Monitor your spending and budgets for this month.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,450.00</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                +20.1% <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,240.50</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-rose-500 flex items-center font-medium">
                +4.3% <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.5%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                +2.1% <ArrowUpRight className="h-3 w-3" />
              </span>{" "}
              efficiency increase
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 flex items-center font-medium">
                -12% <ArrowDownRight className="h-3 w-3" />
              </span>{" "}
              volume decrease
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Spending Trends</CardTitle>
            <CardDescription>
              Daily spending analysis across the current month.
            </CardDescription>
          </CardHeader>
          {/* <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "oklch(0.7 0.01 260)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.22 0.02 260)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                  itemStyle={{ color: "oklch(0.95 0.01 260)" }}
                />
                <Bar dataKey="amount" fill="var(--color-brand-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent> */}
        </Card>

        <Card className="col-span-3 border-border/40 bg-card/40">
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>
              Spending by category for December 2025.
            </CardDescription>
          </CardHeader>
          {/* <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.22 0.02 260)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-2 mt-4 px-4">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent> */}
        </Card>
      </div>
    </div>
  );
}
