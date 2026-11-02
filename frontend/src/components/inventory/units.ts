"use client";

/**
 * Units (Inventory -> Units). Products store a unit by its short name
 * (e.g. "Pcs"); "allow decimal" says whether quantities may be fractional.
 * Demo store — replaced by the API later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";

export type Unit = { id: number; name: string; shortName: string; allowDecimal: boolean };

export const DEMO_UNITS: Unit[] = [
  { id: 1, name: "Pieces", shortName: "Pcs", allowDecimal: false },
  { id: 2, name: "Box", shortName: "Box", allowDecimal: false },
  { id: 3, name: "Pack", shortName: "Pack", allowDecimal: false },
  { id: 4, name: "Kilogram", shortName: "Kg", allowDecimal: true },
];

const store = createDemoStore<Unit>("opalpay.demo-units", DEMO_UNITS);

export const updateUnits = store.update;
export const useUnits = store.use;
