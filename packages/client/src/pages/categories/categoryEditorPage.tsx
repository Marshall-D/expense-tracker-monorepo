// packages/client/src/pages/categories/CategoryEditorPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CategoryForm from "./categoryForm";
import ROUTES from "@/utils/routes";
import type { Category } from "@/types/categories";
import { Button } from "@/components/ui/button";

const DUMMY_CATEGORIES: Record<string, Category> = {
  "1": { id: "1", name: "Food", color: "#f87171", type: "Global" },
  "2": { id: "2", name: "Transport", color: "#fbbf24", type: "Global" },
  "3": { id: "3", name: "Musicals", color: "#FF5733", type: "Custom" },
};

export default function CategoryEditorPage(): JSX.Element {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [initial, setInitial] = useState<Partial<Category> | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(!!id);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitial(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    const t = setTimeout(() => {
      const found = DUMMY_CATEGORIES[id];
      if (found) setInitial(found);
      else setError("Category not found (dummy).");
      setLoading(false);
    }, 350);

    return () => clearTimeout(t);
  }, [id]);

  const handleSubmit = async (payload: any) => {
    setError(null);
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    navigate(ROUTES.CATEGORIES);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this category? This action cannot be undone.")) return;
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 500));
    setDeleting(false);
    navigate(ROUTES.CATEGORIES);
  };

  if (loading) return <div>Loading category…</div>;
  if (!isNew && error)
    return <div className="text-sm text-destructive">Error: {error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "New Category" : "Edit Category"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew
              ? "Create a new category to organize your expenses."
              : "Update category details."}
          </p>
        </div>

        {!isNew && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.CATEGORIES)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <CategoryForm
        initial={initial ?? undefined}
        submitLabel={isNew ? "Create Category" : "Save Changes"}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
