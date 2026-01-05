// packages/client/src/hooks/useCategories.ts

import { useQuery } from "@tanstack/react-query";
import * as categoryService from "@/services";
import { queryKeys } from "@/lib";
import { Category } from "@/types/categories";

export const useCategories = (includeGlobal = true) =>
  useQuery<Category[]>({
    queryKey: [queryKeys.categories, { includeGlobal }],
    queryFn: () => categoryService.fetchCategories(includeGlobal),
    staleTime: 1000 * 60 * 5,
  });
