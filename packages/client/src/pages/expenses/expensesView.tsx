// packages/client/src/pages/expenses/ExpensesView.tsx
/**
 * Presentational Expenses view.
 * Renders UI based on the shape exposed by useExpensesPage.
 
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Download,
  X,
} from "lucide-react";

import {
  Badge,
  InfoModal,
  Table,
  Card,
  CardContent,
  CardHeader,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  Input,
  TableRow,
  Button,
} from "@/components";
import { ROUTES } from "@/utils";

export function ExpensesView(props: any) {
  const {
    data,
    categories,
    isLoading,
    isFetching,
    isError,

    searchTerm,
    setSearchTerm,
    workingCategoryIds,
    setWorkingCategoryIds,
    workingFrom,
    setWorkingFrom,
    workingTo,
    setWorkingTo,

    drawerOpen,
    setDrawerOpen,
    dateRangeInvalid,

    setPage,
    total,
    currentPage,
    startIndex,
    endIndex,
    hasPrev,
    hasNext,

    deleteModalOpen,
    setDeleteModalOpen,
    requestDelete,
    performDelete,

    handleApply,
    handleClear,

    handleExport,
    isExporting,

    isDeleting,
  } = props;

  // Filter panel (re-used)
  const FilterPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        {/* Close button only visible on mobile / small screens */}
        <button
          aria-label="Close filters"
          onClick={() => setDrawerOpen(false)}
          className="p-1 rounded-md text-muted-foreground hover:bg-accent/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Categories</div>
        <div className="flex flex-col max-h-48 overflow-auto pr-2">
          {categories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No categories</div>
          ) : (
            categories.map((c: any) => {
              const checked = workingCategoryIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={() =>
                      setWorkingCategoryIds((prev: any) =>
                        prev.includes(c.id)
                          ? prev.filter((x: any) => x !== c.id)
                          : [...prev, c.id]
                      )
                    }
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Date range */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Date range</div>

        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-medium mb-1">From</div>
            <input
              type="date"
              value={workingFrom}
              onChange={(e) => setWorkingFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
            />
          </div>

          <div>
            <div className="text-xs font-medium mb-1">To</div>
            <input
              type="date"
              value={workingTo}
              onChange={(e) => setWorkingTo(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border/20 bg-background/50"
            />
          </div>
        </div>

        {dateRangeInvalid && (
          <div className="text-sm text-destructive mt-2">
            Invalid range: from must be before or equal to to.
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 rounded-md border border-border/20"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          className="flex-1 rounded-md"
          onClick={handleApply}
          disabled={Boolean(
            workingFrom && workingTo && workingFrom > workingTo
          )}
        >
          Apply
        </Button>
      </div>
    </div>
  );

  // Render
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />{" "}
            {isExporting ? "Downloading…" : "Export CSV"}
          </Button>

          <Button asChild size="sm" className="rounded-full gap-2">
            <Link to={ROUTES.EXPENSES_NEW}>
              <Plus className="h-4 w-4" /> Add New
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="w-full">
        {/* Desktop: single search bar */}
        <div className="hidden lg:block relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description or category..."
            className="pl-9 bg-background/50 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile/tablet: search + filter button */}
        <div className="lg:hidden grid grid-cols-2 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 rounded-md flex items-center justify-center gap-2"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-controls="expenses-filter-panel"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main list */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Card className="border-border/40 bg-card/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isLoading || isFetching ? (
                    <span>Loading results…</span>
                  ) : total === 0 ? (
                    <span>No expenses yet.</span>
                  ) : (
                    <span>
                      Showing {startIndex}–{endIndex} of {total}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    Page {currentPage}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border border-border/40 overflow-hidden">
                {isLoading && !data ? (
                  <div className="p-6 text-center">Loading expenses…</div>
                ) : isError ? (
                  <div className="p-6 text-center text-destructive">
                    Failed to load expenses.
                  </div>
                ) : (
                  <>
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
                        {data && data.data.length > 0 ? (
                          data.data.map((expense: any) => (
                            <TableRow
                              key={expense.id}
                              className="hover:bg-accent/5 transition-colors"
                            >
                              <TableCell className="text-sm font-medium text-muted-foreground">
                                {expense.date
                                  ? new Date(expense.date).toLocaleDateString()
                                  : ""}
                              </TableCell>
                              <TableCell className="font-medium">
                                {expense.description}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 rounded-full font-medium"
                                >
                                  {expense.category ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono">
                                {expense.currency === "USD" ? "$" : "₦"}
                                {expense.amount.toLocaleString()}
                              </TableCell>

                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-primary"
                                  >
                                    <Link
                                      to={ROUTES.EXPENSES_BY_ID(expense.id)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-destructive"
                                    onClick={() => requestDelete(expense.id)}
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center p-6">
                              No expenses yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="p-4 flex items-center justify-between border-t border-border/30 bg-muted/5">
                      <div className="text-xs text-muted-foreground">
                        {total === 0
                          ? ""
                          : `Showing ${startIndex}–${endIndex} of ${total}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPage((p: any) => Math.max(1, p - 1))
                          }
                          disabled={!hasPrev || isFetching}
                        >
                          Prev
                        </Button>
                        <div className="text-sm">{currentPage}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((p: any) => p + 1)}
                          disabled={!hasNext || isFetching}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: filters on desktop only */}
        <aside
          id="expenses-filter-panel"
          className="hidden lg:block lg:w-80 w-full sticky top-24 h-[70vh] overflow-y-auto"
        >
          <div className="p-4 bg-card/40 border-2 border-border/40 rounded-lg h-full">
            {FilterPanel}
          </div>
        </aside>
      </div>

      <InfoModal
        open={deleteModalOpen}
        title="Delete expense?"
        message="This action will permanently delete the expense. Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        onCancel={() => {
          setDeleteModalOpen(false);
          // clear target
        }}
        onConfirm={performDelete}
      />

      {/* Drawer for mobile */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[520px] md:w-[420px] bg-card/90 p-4">
            <div className="p-4 bg-card/40 border-2 border-border/40 rounded-lg h-full">
              {FilterPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
