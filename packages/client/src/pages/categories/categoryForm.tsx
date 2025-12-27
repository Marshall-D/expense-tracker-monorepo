// packages/client/src/pages/categories/CategoryForm.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  initial?: { name?: string; color?: string; type?: string };
  onSubmit: (payload: any) => Promise<void>;
  submitLabel?: string;
};

export default function CategoryForm({
  initial = {},
  onSubmit,
  submitLabel = "Save",
}: Props) {
  const [name, setName] = useState(initial.name ?? "");
  const [color, setColor] = useState(initial.color ?? "#60a5fa");
  const [type, setType] = useState(initial.type ?? "Custom");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), color, type });
    } catch (err: any) {
      setError(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{submitLabel} category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-md"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 px-3 rounded-md"
              >
                <option value="Global">Global</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          {error && <div className="text-destructive text-sm">{error}</div>}

          <div>
            <Button type="submit" className="rounded-full" disabled={loading}>
              {loading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
