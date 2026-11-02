"use client";

/**
 * Opening stock tables, shared by the "Update & edit quantity" screen and the
 * Stock tab of Edit product: one table per business location, a row per
 * product (or variation) with quantity, unit cost, subtotal, date and note.
 *
 * Lines are keyed by location and row key (not position), so adding or
 * removing a variation never shifts quantities onto the wrong row.
 */

import { LOCATION_CODES } from "@/components/inventory/products-data";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export type StockLine = { quantity: string; cost: string; note: string };
/** location -> row key -> line */
export type StockLines = Record<string, Record<string, StockLine>>;
/** A product, or one of its variations, as a stock row. */
export type StockRow = { key: string; name: string; current: number };

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Starts with each row's current stock in the first location, so saving unchanged keeps it. */
export function initialStockLines(locations: string[], rows: StockRow[], cost: number): StockLines {
  return Object.fromEntries(
    locations.map((location, li) => [
      location,
      Object.fromEntries(
        rows.map((row) => [
          row.key,
          {
            quantity: li === 0 && row.current > 0 ? String(row.current) : "",
            cost: cost.toFixed(2),
            note: "",
          },
        ]),
      ),
    ]),
  );
}

/** A line, or an empty one for rows/locations added since the lines were made. */
export function lineAt(lines: StockLines, location: string, key: string, cost: number): StockLine {
  return lines[location]?.[key] ?? { quantity: "", cost: cost.toFixed(2), note: "" };
}

export function setLine(
  lines: StockLines,
  location: string,
  key: string,
  cost: number,
  patch: Partial<StockLine>,
): StockLines {
  return {
    ...lines,
    [location]: { ...lines[location], [key]: { ...lineAt(lines, location, key, cost), ...patch } },
  };
}

/** Total quantity of one row across the given locations. */
export function quantityOf(lines: StockLines, locations: string[], key: string) {
  return locations.reduce((t, l) => t + (Number(lineAt(lines, l, key, 0).quantity) || 0), 0);
}

const subtotal = (line: StockLine) => (Number(line.quantity) || 0) * (Number(line.cost) || 0);

export function stockTotal(lines: StockLines, locations: string[], rows: StockRow[], cost: number) {
  return locations.reduce(
    (t, l) => t + rows.reduce((s, r) => s + subtotal(lineAt(lines, l, r.key, cost)), 0),
    0,
  );
}

export function StockTables({
  rows,
  locations,
  unit,
  defaultCost,
  lines,
  onChange,
  stamp,
}: {
  rows: StockRow[];
  locations: string[];
  unit: string;
  defaultCost: number;
  lines: StockLines;
  onChange: (lines: StockLines) => void;
  /** Date shown on every line (read only, like the old screen). */
  stamp: string;
}) {
  if (locations.length === 0)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          This product isn&apos;t in any business location yet, so there&apos;s nowhere to put stock.
        </p>
      </Card>
    );

  return (
    <>
      {locations.map((location) => (
        <Card
          key={location}
          title={
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="store" className="h-4 w-4 text-muted" />
              Location: {location}
              <span className="font-normal text-muted">({LOCATION_CODES[location]})</span>
            </h2>
          }
          bodyClassName="px-0 pb-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Product name</th>
                  <th className="px-5 py-2.5 font-medium">Quantity</th>
                  <th className="px-5 py-2.5 font-medium">Unit cost (before tax)</th>
                  <th className="px-5 py-2.5 text-right font-medium">Subtotal (before tax)</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const line = lineAt(lines, location, row.key, defaultCost);
                  const change = (patch: Partial<StockLine>) =>
                    onChange(setLine(lines, location, row.key, defaultCost, patch));
                  return (
                    <tr key={row.key} className="border-b border-line align-top last:border-0">
                      <td className="px-5 py-3 font-medium">{row.name}</td>
                      <td className="px-5 py-3">
                        <span className="flex w-40 overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25 dark:border-navy-700">
                          <input
                            aria-label={`Quantity of ${row.name} at ${location}`}
                            value={line.quantity}
                            onChange={(event) => change({ quantity: event.target.value.replace(/[^\d.]/g, "") })}
                            inputMode="decimal"
                            placeholder="0.00"
                            className="w-full min-w-0 bg-white px-3 py-1.5 text-sm tabular-nums outline-none dark:bg-navy-900"
                          />
                          <span className="border-l border-zinc-300 bg-surface px-2.5 py-1.5 text-xs text-muted dark:border-navy-700">
                            {unit}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="relative block w-36">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                            $
                          </span>
                          <input
                            aria-label={`Unit cost of ${row.name}`}
                            value={line.cost}
                            onChange={(event) => change({ cost: event.target.value.replace(/[^\d.]/g, "") })}
                            inputMode="decimal"
                            className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-7 pr-3 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                          />
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">
                        {USD.format(subtotal(line))}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-block rounded-lg bg-surface px-3 py-1.5 text-xs text-muted">
                          {stamp}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <textarea
                          aria-label={`Note for ${row.name}`}
                          rows={1}
                          value={line.note}
                          onChange={(event) => change({ note: event.target.value })}
                          placeholder="Optional"
                          className="w-full min-w-48 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}

/** "11/02/2026, 08:33 PM" — for the read-only Date column. */
export function stockStamp(date: Date) {
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const formatUsd = (n: number) => USD.format(n);
