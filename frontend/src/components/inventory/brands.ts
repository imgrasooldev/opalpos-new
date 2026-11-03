"use client";

/**
 * Product brands (Inventory -> Brands). Products store the brand by name.
 * Demo store — replaced by the API later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";

export type Brand = { id: number; name: string; note: string };

export const DEMO_BRANDS: Brand[] = [
  { id: 1, name: "Cloud Co", note: "Vapes and pods" },
  { id: 2, name: "Pure Glass", note: "Glass pipes" },
  { id: 3, name: "Zippo", note: "Lighters and butane" },
  { id: 4, name: "Starbuzz", note: "Hookah and charcoal" },
];

const store = createDemoStore<Brand>("opalpay.demo-brands", DEMO_BRANDS);

export const updateBrands = store.update;
export const useBrands = store.use;
