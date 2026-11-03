"use client";

/**
 * Sell -> Discounts: automatic product discounts, as in the old Opal POS.
 * A discount targets products, a brand and/or a category at one location,
 * inside an optional date window. Add sale applies the best matching active
 * discount (highest priority) to a product when it's added.
 *
 * STAND-IN FOR THE API — replaced by the discounts endpoint later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";

export type Discount = {
  id: number;
  name: string;
  /** Empty = not limited to particular products. */
  productIds: number[];
  brand: string | null;
  category: string | null;
  location: string;
  /** Higher wins when several discounts match. */
  priority: number;
  type: "Fixed" | "Percentage";
  amount: number;
  /** ISO date-times; null = open-ended. */
  startsAt: string | null;
  endsAt: string | null;
  /** Selling price group id; null = all groups. */
  priceGroupId: number | null;
  applyInCustomerGroups: boolean;
  active: boolean;
};

export const DEMO_DISCOUNTS: Discount[] = [
  {
    id: 1,
    name: "November glass deal",
    productIds: [],
    brand: null,
    category: "Glass",
    location: "GR Store",
    priority: 2,
    type: "Percentage",
    amount: 10,
    startsAt: "2026-11-01T00:00",
    endsAt: "2026-11-30T23:59",
    priceGroupId: null,
    applyInCustomerGroups: false,
    active: true,
  },
  {
    id: 2,
    name: "Pod clearance",
    productIds: [9],
    brand: null,
    category: null,
    location: "City Outlet",
    priority: 1,
    type: "Fixed",
    amount: 1,
    startsAt: "2026-10-01T00:00",
    endsAt: "2026-10-31T23:59",
    priceGroupId: null,
    applyInCustomerGroups: false,
    active: false,
  },
];

const store = createDemoStore<Discount>("opalpay.demo-discounts", DEMO_DISCOUNTS);
export const useDiscounts = store.use;
export const updateDiscounts = store.update;

/** Does this discount cover this product at this location and time? */
export function discountMatches(d: Discount, p: DemoProduct, location: string, at: string) {
  return (
    d.active &&
    d.location === location &&
    (!d.startsAt || at >= d.startsAt) &&
    (!d.endsAt || at <= d.endsAt) &&
    (d.productIds.length === 0 || d.productIds.includes(p.id)) &&
    (!d.brand || d.brand === p.brand) &&
    (!d.category || d.category === p.category || d.category === p.subCategory)
  );
}

/** The matching discount with the highest priority, if any. */
export function bestDiscount(discounts: Discount[], p: DemoProduct, location: string, at: string) {
  return discounts
    .filter((d) => discountMatches(d, p, location, at))
    .sort((a, b) => b.priority - a.priority)[0];
}
