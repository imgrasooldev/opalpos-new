"use client";

/**
 * Product react-query hooks.
 *
 * REFERENCE SLICE — caching/loading/refetch ka pattern.
 *
 * Kaam ki baat: `queryKey` mein filters bhi daalte hain, taake filter badalte
 * hi react-query naya data laaye aur purana cache alag rahe. Mutation ke baad
 * `invalidateQueries` list ko dobara fetch karwa deta hai — manual refetch
 * likhne ki zaroorat nahi.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
  type ProductListResult,
} from "@/lib/services/products";
import type {
  Product,
  ProductCreateInput,
  ProductFilters,
  ProductUpdateInput,
} from "@/types/product";

/** Cache keys ek jagah — typo se do alag cache ban-ne se bachao. */
export const productKeys = {
  all: ["products"] as const,
  list: (filters: ProductFilters) => [...productKeys.all, "list", filters] as const,
  detail: (id: number) => [...productKeys.all, "detail", id] as const,
};

export function useProducts(
  filters: ProductFilters = {},
): UseQueryResult<ProductListResult> {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => listProducts(filters),
    // page badalte waqt list khali na ho — purana data dikhta rahe
    placeholderData: (previous) => previous,
  });
}

export function useProduct(id: number): UseQueryResult<Product> {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateProduct(): UseMutationResult<
  Product,
  Error,
  ProductCreateInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct(
  id: number,
): UseMutationResult<Product, Error, ProductUpdateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductUpdateInput) => updateProduct(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(id), product);
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
