// packages/client/src/services/categoryService.ts
import api from "@/lib/api";
import { Category } from "@/types/categories";

export const fetchCategories = async (
  includeGlobal = true
): Promise<Category[]> => {
  const resp = await api.get<{ data: Category[] }>("/api/categories", {
    params: { includeGlobal },
  });
  // backend returns { data: items } (see your getAllCategories handler)
  return resp.data?.data ?? [];
};

export const createCategory = async (payload: {
  name: string;
  color?: string;
}) => {
  const resp = await api.post("/api/categories", payload);
  return resp.data;
};

export const updateCategory = async (
  id: string,
  payload: { name?: string; color?: string }
) => {
  const resp = await api.put(`/api/categories/${id}`, payload);
  return resp.data;
};

export const deleteCategory = async (id: string) => {
  const resp = await api.delete(`/api/categories/${id}`);
  return resp.data;
};
