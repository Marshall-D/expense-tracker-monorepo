// packages/client/src/pages/categories/CategoriesList.tsx
import React, { KeyboardEvent } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";
import { ROUTES } from "@/utils";
import { Card, CardContent, CardHeader, Button, Badge } from "@/components";
import type { Category } from "@/types/";

type Props = {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  // id of category currently being deleted, to show disabled state on buttons
  deletingId: string | null;
  onNew: () => void;
  onEdit: (id: string) => void;
  onRequestDelete: (id: string, name: string) => void;
};

/**
 * CategoriesList
 *
 * Presentational component that renders categories in two partitions:
 * - globalCategories (provided by app) — no edit/delete
 * - customCategories (user created) — has edit/delete
 *
 */
export function CategoriesList({
  categories,
  isLoading,
  isError,
  deletingId,
  onNew,
  onEdit,
  onRequestDelete,
}: Props) {
  // Partition categories so global ones are shown first
  const globalCategories = categories.filter((c) => c.type === "Global");
  const customCategories = categories.filter((c) => c.type !== "Global");

  if (isLoading) return <div>Loading categories…</div>;
  if (isError)
    return <div className="text-destructive">Failed to load categories.</div>;

  // keyboard handler so Enter/Space activates the card (accessibility)
  const handleKeyDown =
    (fn: () => void) => (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fn();
      }
    };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage spending classifications and custom labels.
          </p>
        </div>

        <div>
          <Button
            asChild
            size="sm"
            className="rounded-full gap-2"
            onClick={onNew}
          >
            <a href={ROUTES.CATEGORIES_NEW}>
              <Plus className="h-4 w-4" /> New Category
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Render global categories first (no edit/delete) */}
        {globalCategories.map((category) => (
          <Card
            key={category.id}
            className="border-border/40 bg-card/40 hover:border-primary/40 transition-all group overflow-hidden"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                  style={{ color: category.color ?? undefined }}
                >
                  <Tags className="h-5 w-5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {category.type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              <h3 className="text-lg font-bold mt-2">{category.name}</h3>

              {/* Global categories: no edit, no delete */}
              <div className="flex items-center gap-2 mt-4 opacity-100">
                <div className="text-sm text-muted-foreground">Provided</div>
              </div>
            </CardContent>

            <div
              className="h-1 w-full"
              style={{ backgroundColor: category.color ?? undefined }}
            />
          </Card>
        ))}

        {/* Then render user's custom categories.
         */}
        {customCategories.map((category) => {
          const goEdit = () => onEdit(category.id);

          return (
            <div
              key={category.id}
              role="button"
              tabIndex={0}
              onClick={goEdit}
              onKeyDown={handleKeyDown(goEdit)}
              className="rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Card className="border-border/40 bg-card/40 hover:border-primary/40 transition-all group overflow-hidden cursor-pointer">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center bg-background/50"
                      style={{ color: category.color ?? undefined }}
                    >
                      <Tags className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {category.type}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  <h3 className="text-lg font-bold mt-2">{category.name}</h3>

                  <div className="flex items-center gap-2 mt-4 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-lg flex-1 text-xs"
                      onClick={(e) => {
                        // stop the card click (navigation) when clicking this button
                        e.stopPropagation();
                        onEdit(category.id);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive rounded-lg"
                      onClick={(e) => {
                        // stop the card click (navigation) when clicking delete
                        e.stopPropagation();
                        onRequestDelete(category.id, category.name);
                      }}
                      disabled={deletingId === category.id}
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>

                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: category.color ?? undefined }}
                />
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
