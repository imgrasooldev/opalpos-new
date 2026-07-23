"use client";

/**
 * Products page.
 *
 * Dhyan do ke yahan `fetch` bilkul nahi hai, aur na hi koi markup jo dobara
 * kaam aa sakta ho. Page sirf:
 *   - URL/UI state rakhta hai (search, page)
 *   - hook call karta hai
 *   - components compose karta hai
 */

import { useState } from "react";

import { PermissionGate } from "@/components/auth/permission-gate";
import { AppShell } from "@/components/layout/app-shell";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductTable } from "@/components/products/product-table";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { useDeleteProduct, useProducts } from "@/hooks/use-products";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error } = useProducts({
    q: search || undefined,
    only_active: onlyActive || undefined,
    page,
    size: PAGE_SIZE,
  });
  const remove = useDeleteProduct();

  const products = data?.items ?? [];

  // filter badle to pehle page par wapas
  function changeFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>

        <div className="mt-6 flex flex-col gap-6">
          <ProductFilters
            search={search}
            onSearchChange={changeFilter(setSearch)}
            onlyActive={onlyActive}
            onOnlyActiveChange={changeFilter(setOnlyActive)}
          />

          {isPending && <Spinner />}
          {isError && <ErrorState error={error} />}

          {!isPending && !isError && products.length === 0 && (
            <EmptyState
              title="No products found"
              description={
                search
                  ? "Try a different search term."
                  : "Add your first product to get started."
              }
            />
          )}

          {products.length > 0 && (
            <>
              <ProductTable
                products={products}
                onDelete={(id) => remove.mutate(id)}
                deletingId={remove.isPending ? remove.variables : null}
              />
              <Pagination meta={data?.meta} onPageChange={setPage} />
            </>
          )}

          <PermissionGate permission="product.create">
            <p className="text-xs text-zinc-500">
              Naya product banane ke liye `ProductForm` component use karo — usay
              ek `unitId` chahiye (units endpoint abhi banna baaki hai).
            </p>
          </PermissionGate>
        </div>
      </div>
    </AppShell>
  );
}
