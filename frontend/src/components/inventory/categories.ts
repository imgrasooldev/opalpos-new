"use client";

/**
 * Product categories (Inventory -> Categories). A category with a `parentId`
 * is a sub category. Products store the category and sub category by name.
 * Demo store — replaced by the API later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";

export type Category = {
  id: number;
  name: string;
  /** Same as the HSN code. */
  code: string;
  description: string;
  parentId: number | null;
};

export const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: "Vapes", code: "8543", description: "E-cigarettes and pods", parentId: null },
  { id: 2, name: "Glass", code: "7013", description: "Pipes and glassware", parentId: null },
  { id: 3, name: "Accessories", code: "9614", description: "Papers, grinders, lighters", parentId: null },
  { id: 4, name: "Hookah", code: "2403", description: "Hookahs and charcoal", parentId: null },
  { id: 5, name: "Disposables", code: "8543", description: "Single-use vapes", parentId: 1 },
  { id: 6, name: "Pods", code: "8543", description: "Refill pods", parentId: 1 },
];

const store = createDemoStore<Category>("opalpay.demo-categories", DEMO_CATEGORIES);

export const updateCategories = store.update;
export const useCategories = store.use;
