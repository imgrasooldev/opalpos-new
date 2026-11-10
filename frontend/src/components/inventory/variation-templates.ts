"use client";

/**
 * Variation templates (Inventory -> Variations): named value lists such as
 * "Color: Black, Silver" that fill a variable product's variation rows.
 *
 * Demo store like product-store.ts — memory plus localStorage, so templates
 * added here are there on the Add product form. Replaced by the API later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";

export type VariationTemplate = { id: number; name: string; values: string[] };

export const DEMO_TEMPLATES: VariationTemplate[] = [
  { id: 1, name: "Black Berry", values: ["Red", "Blue"] },
  { id: 2, name: "Color", values: ["Black", "Silver"] },
  { id: 3, name: "Size", values: ["Small", "Medium", "Large"] },
  { id: 4, name: "Flavor", values: ["Mango", "Mint", "Grape"] },
];

const store = createDemoStore<VariationTemplate>("opalpay.demo-variation-templates", DEMO_TEMPLATES);

export const updateTemplates = store.update;
export const useTemplates = store.use;
