"use client";

/**
 * Demo product store shared by the product screens (list, add, opening stock)
 * so a product added on one page shows up on the next. Kept in memory and in
 * localStorage (see demo-store.ts), so it survives reloads and is shared by
 * every tab.
 *
 * STAND-IN FOR THE API: once the products endpoints are wired up, the screens
 * read and write through the hooks in `hooks/use-products.ts` instead.
 */

import { useSyncExternalStore } from "react";

import { createDemoStore } from "@/components/inventory/demo-store";
import { DEMO_PRODUCTS, type DemoProduct } from "@/components/inventory/products-data";

const store = createDemoStore<DemoProduct>("opalpay.demo-products", DEMO_PRODUCTS);

export const updateProducts = store.update;

/**
 * The products, plus a setter that takes an updater like `setState`.
 * The server and the first client render see the built-in demo list; any
 * saved changes appear right after hydration, without a mismatch.
 */
export function useDemoProducts() {
  return [store.use(), updateProducts] as const;
}

const noSubscribe = () => () => {};

/** False on the server and during hydration — wait for it before reading saved-only data. */
export function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/** Next free id, and a numeric SKU for "leave blank to autogenerate". */
export function nextIds(list: DemoProduct[]) {
  const id = Math.max(0, ...list.map((p) => p.id)) + 1;
  return { id, sku: String(id).padStart(4, "0") };
}
