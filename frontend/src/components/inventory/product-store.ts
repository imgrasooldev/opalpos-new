"use client";

/**
 * Demo product store shared by the product screens (list, add, opening stock)
 * so a product added on one page shows up on the next. Kept in memory and in
 * sessionStorage, so it survives navigation and reloads in the same tab.
 *
 * STAND-IN FOR THE API: once the products endpoints are wired up, the screens
 * read and write through the hooks in `hooks/use-products.ts` instead.
 */

import { useSyncExternalStore } from "react";

import { DEMO_PRODUCTS, type DemoProduct } from "@/components/inventory/products-data";

const KEY = "opalpay.demo-products";

let products: DemoProduct[] | null = null;
const listeners = new Set<() => void>();

function load(): DemoProduct[] {
  if (products) return products;
  try {
    const saved = sessionStorage.getItem(KEY);
    products = saved ? (JSON.parse(saved) as DemoProduct[]) : DEMO_PRODUCTS;
  } catch {
    products = DEMO_PRODUCTS;
  }
  return products;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateProducts(update: (prev: DemoProduct[]) => DemoProduct[]) {
  products = update(load());
  try {
    sessionStorage.setItem(KEY, JSON.stringify(products));
  } catch {
    // storage blocked — changes still apply until the tab is closed
  }
  listeners.forEach((listener) => listener());
}

/**
 * The products, plus a setter that takes an updater like `setState`.
 * The server and the first client render see the built-in demo list; any
 * saved changes appear right after hydration, without a mismatch.
 */
export function useDemoProducts() {
  const list = useSyncExternalStore(subscribe, load, () => DEMO_PRODUCTS);
  return [list, updateProducts] as const;
}

/** False on the server and during hydration — wait for it before reading saved-only products. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Next free id, and a numeric SKU for "leave blank to autogenerate". */
export function nextIds(list: DemoProduct[]) {
  const id = Math.max(0, ...list.map((p) => p.id)) + 1;
  return { id, sku: String(id).padStart(4, "0") };
}
