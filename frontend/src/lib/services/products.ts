/**
 * Products API service — backend ke `/api/v1/products` ka wrapper.
 *
 * REFERENCE SLICE. Layering frontend par bhi wahi hai jo backend par:
 *
 *   types/      -> shakal (backend schemas ka mirror)
 *   lib/services/ -> API calls  <- YE FILE
 *   hooks/      -> react-query (caching, loading, refetch)
 *   app/        -> UI
 *
 * Qaida: `fetch` sirf yahan. Components mein kabhi seedha fetch mat likhna —
 * warna auth header, envelope unwrap aur error handling har jagah repeat hoga.
 */

import { api, type ApiMeta } from "@/lib/api";
import type {
  Product,
  ProductCreateInput,
  ProductFilters,
  ProductUpdateInput,
} from "@/types/product";

const BASE = "/products";

export type ProductListResult = {
  items: Product[];
  meta: ApiMeta | null;
};

/** GET /products — list + pagination meta. */
export async function listProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  const { data, meta } = await api.list<Product>(BASE, filters);
  return { items: data, meta };
}

/** GET /products/{id} */
export function getProduct(id: number): Promise<Product> {
  return api.get<Product>(`${BASE}/${id}`);
}

/** POST /products */
export function createProduct(input: ProductCreateInput): Promise<Product> {
  return api.post<Product>(BASE, input);
}

/** PATCH /products/{id} */
export function updateProduct(
  id: number,
  input: ProductUpdateInput,
): Promise<Product> {
  return api.patch<Product>(`${BASE}/${id}`, input);
}

/** DELETE /products/{id} — backend soft-delete karta hai. */
export function deleteProduct(id: number): Promise<void> {
  return api.delete<void>(`${BASE}/${id}`);
}
