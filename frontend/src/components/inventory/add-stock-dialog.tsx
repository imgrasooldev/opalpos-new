"use client";

/**
 * "Update & Edit Quantity" popup behind the products list's Add stock button,
 * as in the old Opal POS: per location, each product (or variation) shows its
 * current stock and takes a quantity to ADD — unlike the opening stock page,
 * which sets the quantity outright.
 *
 * Stock is tracked per product / variation, not per location, so the current
 * stock shown is the total across locations.
 */

import { useState } from "react";

import { LOCATION_CODES, type DemoProduct } from "@/components/inventory/products-data";
import { formatUsd, stockStamp } from "@/components/inventory/stock-lines";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

type Line = { add: string; cost: string; note: string };

export function AddStockDialog({
  product,
  onClose,
  onSave,
}: {
  product: DemoProduct;
  onClose: () => void;
  /** Quantities to add: row index (variation index, or 0 for a single product) per location. */
  onSave: (added: { index: number; location: string; qty: number }[]) => void;
}) {
  const rows = product.variations.length
    ? product.variations.map((v) => ({ name: `${product.name} (${v.name})`, stock: v.stock }))
    : [{ name: product.name, stock: product.stock }];

  const [lines, setLines] = useState<Record<string, Line[]>>(() =>
    Object.fromEntries(
      product.locations.map((l) => [
        l,
        rows.map(() => ({ add: "", cost: product.purchasePrice.toFixed(2), note: "" })),
      ]),
    ),
  );
  const [now] = useState(() => new Date());

  const subtotal = (line: Line) => (Number(line.add) || 0) * (Number(line.cost) || 0);
  const total = Object.values(lines).flat().reduce((t, line) => t + subtotal(line), 0);

  function update(location: string, index: number, patch: Partial<Line>) {
    setLines((prev) => ({
      ...prev,
      [location]: prev[location].map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  function save() {
    onSave(
      product.locations.flatMap((location) =>
        rows.map((_, index) => ({ index, location, qty: Number(lines[location][index].add) || 0 })),
      ),
    );
  }

  return (
    <Modal
      title="Update & edit quantity"
      description={`Add stock for ${product.name}. Current stock is the total across locations.`}
      onClose={onClose}
      className="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">
            Total amount (exc. tax):{" "}
            <span className="text-base font-semibold tabular-nums text-foreground">{formatUsd(total)}</span>
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      {product.locations.length === 0 ? (
        <p className="text-[13px] text-muted">
          {product.name} isn&apos;t in any business location yet. Add it to a location first.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {product.locations.map((location) => (
            <section key={location} className="overflow-hidden rounded-xl border border-line">
              <h3 className="flex items-center gap-2 bg-surface px-4 py-2.5 text-[13px] font-semibold">
                <Icon name="store" className="h-4 w-4 text-muted" />
                Location: {location}
                <span className="font-normal text-muted">({LOCATION_CODES[location]})</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[13px]">
                  <thead>
                    <tr className="border-y border-line text-xs text-muted">
                      <th className="px-4 py-2 font-medium">Product name</th>
                      <th className="px-4 py-2 text-right font-medium">Current stock</th>
                      <th className="px-4 py-2 font-medium">Quantity add</th>
                      <th className="px-4 py-2 font-medium">Unit cost (before tax)</th>
                      <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const line = lines[location][i];
                      return (
                        <tr key={row.name} className="border-b border-line align-top last:border-0">
                          <td className="min-w-44 px-4 py-2.5 font-medium">{row.name}</td>
                          <td className="px-4 py-2.5 text-right font-medium tabular-nums text-emerald-600">
                            {row.stock.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="flex w-36 overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25 dark:border-navy-700">
                              <input
                                aria-label={`Quantity to add of ${row.name} at ${location}`}
                                value={line.add}
                                onChange={(event) => update(location, i, { add: event.target.value.replace(/[^\d.]/g, "") })}
                                inputMode="decimal"
                                placeholder="0"
                                className="w-full min-w-0 bg-white px-3 py-1.5 text-sm tabular-nums outline-none dark:bg-navy-900"
                              />
                              <span className="border-l border-zinc-300 bg-surface px-2.5 py-1.5 text-xs text-muted dark:border-navy-700">
                                {product.unit}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="relative block w-32">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                                $
                              </span>
                              <input
                                aria-label={`Unit cost of ${row.name}`}
                                value={line.cost}
                                onChange={(event) => update(location, i, { cost: event.target.value.replace(/[^\d.]/g, "") })}
                                inputMode="decimal"
                                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-7 pr-3 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                              />
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatUsd(subtotal(line))}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block whitespace-nowrap rounded-lg bg-surface px-2.5 py-1.5 text-xs text-muted">
                              {stockStamp(now)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <textarea
                              aria-label={`Note for ${row.name}`}
                              rows={1}
                              value={line.note}
                              onChange={(event) => update(location, i, { note: event.target.value })}
                              placeholder="Optional"
                              className="w-full min-w-40 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
