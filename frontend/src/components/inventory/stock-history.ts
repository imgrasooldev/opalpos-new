/**
 * Stock history for a product or variation: what came in, what went out, and
 * the running quantity.
 *
 * Two sources, merged in date order:
 *   - movements recorded by this app (Add stock, Opening stock, Edit -> Stock)
 *   - a generated starting history for the demo data: an opening stock, then
 *     the sales, adjustments and transfers the product already has
 * The generated opening is sized so the whole history ends exactly at the
 * current stock. Replaced by the stock history endpoint once it exists.
 */

import type {
  DemoProduct,
  MovementType,
  StockMovement,
} from "@/components/inventory/products-data";

export type HistoryRow = StockMovement & { id: string; newQty: number };

/** The stock-carrying rows of a product: its variations, or the product itself. */
export function stockUnits(p: DemoProduct) {
  return p.variations.length
    ? p.variations.map((v) => ({
        sku: v.sku,
        label: `${p.name} - ${v.name}`,
        stock: v.stock,
        sold: v.sold,
        transferred: 0,
        adjusted: 0,
      }))
    : [
        {
          sku: p.sku,
          label: p.name,
          stock: p.stock,
          sold: p.sold,
          transferred: p.transferred,
          adjusted: p.adjusted,
        },
      ];
}

/** Adds movements (skipping zero quantities) stamped with the current time. */
export function logStock(
  p: DemoProduct,
  changes: { sku: string; qty: number; location: string | null; type?: MovementType }[],
): DemoProduct {
  const now = new Date().toISOString().slice(0, 16);
  const added = changes
    .filter((c) => Math.abs(c.qty) > 0.0001)
    .map((c) => ({
      sku: c.sku,
      type: c.type ?? ("Opening / Add stock" as const),
      qty: c.qty,
      location: c.location,
      date: now,
      ref: null,
      party: null,
    }));
  return added.length ? { ...p, movements: [...(p.movements ?? []), ...added] } : p;
}

/** Every movement of one variation (or single product), oldest first, with the running quantity. */
export function historyFor(p: DemoProduct, sku: string): HistoryRow[] {
  const unit = stockUnits(p).find((u) => u.sku === sku);
  if (!unit) return [];
  const logged = (p.movements ?? []).filter((m) => m.sku === sku);
  const loggedTotal = logged.reduce((t, m) => t + m.qty, 0);
  const home = p.locations[0] ?? null;

  // generated start: opening + the existing sales / adjustments / transfers
  const generated: StockMovement[] = [];
  const opening = unit.stock - loggedTotal + unit.sold + unit.adjusted + unit.transferred;
  if (opening !== 0)
    generated.push({ sku, type: "Opening / Add stock", qty: opening, location: home, date: "2026-10-01T09:00", ref: null, party: null });

  // spread the units sold over up to three sales — at the same location as the
  // generated opening, so no single location's stock ever goes below zero
  const sales = Math.min(3, unit.sold);
  for (let i = 0; i < sales; i++) {
    const qty = i === sales - 1 ? unit.sold - Math.floor(unit.sold / sales) * (sales - 1) : Math.floor(unit.sold / sales);
    generated.push({
      sku,
      type: "Sell",
      qty: -qty,
      location: home,
      date: `2026-10-${String(5 + i * 7).padStart(2, "0")}T${11 + i}:20`,
      ref: `2026-0${94900 + p.id * 10 + i}`,
      party: "Walk-In Customer",
    });
  }
  if (unit.adjusted)
    generated.push({ sku, type: "Stock adjustment", qty: -unit.adjusted, location: home, date: "2026-10-20T16:05", ref: `SA2026/${String(p.id).padStart(4, "0")}`, party: null });
  if (unit.transferred)
    generated.push({
      sku,
      type: "Stock transfer (out)",
      qty: -unit.transferred,
      location: home,
      date: "2026-10-22T10:40",
      ref: `ST2026/${String(p.id).padStart(4, "0")}`,
      party: null,
    });

  let running = 0;
  return [...generated, ...logged]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m, i) => {
      running += m.qty;
      return { ...m, id: `${m.date}-${i}`, newQty: running };
    });
}

/** Quantities in / out, as on the old screen's summary. */
export function summarize(rows: HistoryRow[]) {
  const sum = (type: MovementType) =>
    rows.filter((r) => r.type === type).reduce((t, r) => t + Math.abs(r.qty), 0);
  return {
    totalPurchase: 0,
    openingAdd: rows.filter((r) => r.type === "Opening / Add stock").reduce((t, r) => t + r.qty, 0),
    sellReturn: 0,
    transfersIn: 0,
    sold: sum("Sell"),
    adjustment: sum("Stock adjustment"),
    purchaseReturn: 0,
    transfersOut: sum("Stock transfer (out)"),
    current: rows.reduce((t, r) => t + r.qty, 0),
  };
}
