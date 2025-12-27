// packages/client/src/pages/expenses/expenses.tsx
import React, { Suspense, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Pencil, Trash2, Download } from "lucide-react";
import ROUTES from "@/utils/routes";

const dummyExpenses = [
  {
    id: "1",
    amount: 2500,
    currency: "NGN",
    description: "Weekly Groceries",
    category: "Food",
    date: "2025-12-24",
  },
  {
    id: "2",
    amount: 45.99,
    currency: "USD",
    description: "Movie Tickets",
    category: "Entertainment",
    date: "2025-12-23",
  },
  {
    id: "3",
    amount: 12000,
    currency: "NGN",
    description: "Internet Subscription",
    category: "Utilities",
    date: "2025-12-22",
  },
  {
    id: "4",
    amount: 20,
    currency: "USD",
    description: "Coffee",
    category: "Food",
    date: "2025-12-22",
  },
  {
    id: "5",
    amount: 5000,
    currency: "NGN",
    description: "Fuel",
    category: "Transport",
    date: "2025-12-21",
  },
];

function ExpensesContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const q = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(q);

  const updateSearch = (term: string) => {
    setSearchTerm(term);
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("q", term);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track your individual spending records.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          {/* Add New -> /dashboard/expenses/new */}
          <Button asChild size="sm" className="rounded-full gap-2">
            <Link to={ROUTES.EXPENSES_NEW}>
              <Plus className="h-4 w-4" /> Add New
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/40 bg-card/40">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description or category..."
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e) => updateSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyExpenses
                  .filter(
                    (e) =>
                      e.description
                        .toLowerCase()
                        .includes((searchTerm || "").toLowerCase()) ||
                      e.category
                        .toLowerCase()
                        .includes((searchTerm || "").toLowerCase())
                  )
                  .map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 rounded-full font-medium"
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {expense.currency === "USD" ? "$" : "₦"}
                        {expense.amount.toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {/* Edit -> /dashboard/expenses/:id */}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-primary"
                          >
                            <Link to={ROUTES.EXPENSES_BY_ID(expense.id)}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this expense?"))
                                console.log("delete", expense.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}
