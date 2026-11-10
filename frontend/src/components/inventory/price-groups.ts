"use client";

/**
 * Selling price groups (Inventory -> Selling Price Group): named price lists
 * such as Wholesale. Each product can set its own price per group and
 * variation (`DemoProduct.groupPrices`); without one, the default selling
 * price applies.
 *
 * Demo store like product-store.ts — memory plus localStorage. Replaced by
 * the API later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";

export type PriceGroup = { id: number; name: string; description: string; active: boolean };

export const DEMO_GROUPS: PriceGroup[] = [
  { id: 1, name: "Wholesale", description: "Bulk buyers and resellers", active: true },
  { id: 2, name: "VIP", description: "Loyalty customers", active: true },
];

const store = createDemoStore<PriceGroup>("opalpay.demo-price-groups", DEMO_GROUPS);

export const updateGroups = store.update;
export const usePriceGroups = store.use;

/** Price of one SKU in a group, or null when the group has no price for it. */
export function groupPrice(product: DemoProduct, groupId: number, sku: string): number | null {
  return product.groupPrices?.[groupId]?.[sku] ?? null;
}
