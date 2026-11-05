"use client";

/**
 * Reports -> Trending products, as in the old Opal POS: filters (business
 * location, category, sub category, brand, unit, date range, number of
 * products, product type) applied with "Apply filters", then the top
 * products by total units sold and a Print button.
 *
 * Units sold = final sales (POS included) minus what customers returned.
 * Drafts and quotations don't count. Each variation is ranked on its own.
 */

import { useMemo, useState } from "react";

import { useBrands } from "@/components/inventory/brands";
import { useCategories } from "@/components/inventory/categories";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS, PRODUCT_TYPES } from "@/components/inventory/products-data";
import { useUnits } from "@/components/inventory/units";
import { returnedQty, useSales, useSellReturns } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Filters = {
  location: string;
  category: string;
  subCategory: string;
  brand: string;
  unit: string;
  from: string;
  to: string;
  limit: string;
  type: string;
};
const DEFAULT_FILTERS: Filters = { location: "", category: "", subCategory: "", brand: "", unit: "", from: "", to: "", limit: "5", type: "" };

export type TrendingRow = { sku: string; label: string; name: string; unit: string; qty: number; invoices: number };

const qtyFmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function TrendingProducts() {
  const hydrated = useHydrated();
  const [products] = useDemoProducts();
  const sales = useSales();
  const returns = useSellReturns();
  const categories = useCategories();
  const brands = useBrands();
  const units = useUnits();
  // the form edits a draft; the chart follows only what was applied
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);

  const parents = categories.filter((c) => c.parentId === null);
  const parentId = parents.find((c) => c.name === draft.category)?.id;
  const subs = categories.filter((c) => c.parentId !== null && c.parentId === parentId);

  const ranked = useMemo(() => {
    const f = applied;
    const byId = new Map(products.map((p) => [p.id, p]));
    const totals = new Map<string, TrendingRow & { saleIds: Set<number> }>();
    for (const s of sales) {
      if (s.status !== "Final") continue;
      if (f.location && s.location !== f.location) continue;
      if (f.from && s.date.slice(0, 10) < f.from) continue;
      if (f.to && s.date.slice(0, 10) > f.to) continue;
      for (const l of s.lines) {
        const p = byId.get(l.productId);
        if (!p) continue;
        if (f.category && p.category !== f.category) continue;
        if (f.subCategory && p.subCategory !== f.subCategory) continue;
        if (f.brand && p.brand !== f.brand) continue;
        if (f.unit && p.unit !== f.unit) continue;
        if (f.type && p.type !== f.type) continue;
        const qty = l.qty - returnedQty(returns, s.id, l.sku);
        const row = totals.get(l.sku) ?? {
          sku: l.sku,
          name: l.name,
          unit: p.unit,
          label: `${l.name} - ${l.sku} (${p.unit})`,
          qty: 0,
          invoices: 0,
          saleIds: new Set<number>(),
        };
        row.qty += qty;
        row.saleIds.add(s.id);
        row.invoices = row.saleIds.size;
        totals.set(l.sku, row);
      }
    }
    const limit = Math.max(1, Number(f.limit) || 5);
    return [...totals.values()]
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((r): TrendingRow => ({ sku: r.sku, label: r.label, name: r.name, unit: r.unit, qty: r.qty, invoices: r.invoices }));
  }, [applied, products, sales, returns]);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    // a new category clears a sub category that belongs to another one
    setDraft((prev) => ({ ...prev, [key]: value, ...(key === "category" ? { subCategory: "" } : {}) }));
  }

  const changed = JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
          </h2>
        }
        bodyClassName="border-t border-line pt-4 print:hidden"
        className="print:hidden"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Business location"
            value={draft.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All locations" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Category"
            value={draft.category}
            onChange={(v) => set("category", v)}
            options={[{ value: "", label: "All" }, ...parents.map((c) => ({ value: c.name, label: c.name }))]}
          />
          <FilterSelect
            label="Sub category"
            value={draft.subCategory}
            onChange={(v) => set("subCategory", v)}
            options={[{ value: "", label: "All" }, ...subs.map((c) => ({ value: c.name, label: c.name }))]}
          />
          <FilterSelect
            label="Brand"
            value={draft.brand}
            onChange={(v) => set("brand", v)}
            options={[{ value: "", label: "All" }, ...brands.map((b) => ({ value: b.name, label: b.name }))]}
          />
          <FilterSelect
            label="Unit"
            value={draft.unit}
            onChange={(v) => set("unit", v)}
            options={[{ value: "", label: "All" }, ...units.map((u) => ({ value: u.shortName, label: `${u.name} (${u.shortName})` }))]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={draft.from}
                onChange={(event) => set("from", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", draft.from ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={draft.to}
                onChange={(event) => set("to", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", draft.to ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              Number of products
              <span title="How many of the top selling products to show." className="text-brand-500">
                <Icon name="info" className="h-3.5 w-3.5" />
              </span>
            </span>
            <input
              aria-label="Number of products"
              value={draft.limit}
              onChange={(event) => set("limit", event.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className={cn(filterClass, "border-line px-3")}
            />
          </label>
          <FilterSelect
            label="Product type"
            value={draft.type}
            onChange={(v) => set("type", v)}
            options={[{ value: "", label: "All" }, ...PRODUCT_TYPES.map((t) => ({ value: t, label: t }))]}
          />
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {changed && <span className="text-xs text-muted">Filters changed. Apply them to update the chart.</span>}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDraft(DEFAULT_FILTERS);
              setApplied(DEFAULT_FILTERS);
            }}
          >
            Reset
          </Button>
          <Button type="button" variant="brand" onClick={() => setApplied(draft)}>
            Apply filters
          </Button>
        </div>
      </Card>

      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            Top trending products
            <span title="Units sold in final sales (POS included), minus units customers returned." className="text-brand-500">
              <Icon name="info" className="h-4 w-4" />
            </span>
          </h2>
        }
        action={<span className="text-xs text-muted">Top {Math.max(1, Number(applied.limit) || 5)} by total units sold</span>}
        bodyClassName="border-t border-line pt-5"
      >
        {!hydrated ? (
          <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
        ) : ranked.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">No sales match these filters.</p>
        ) : (
          <>
            <TrendingChart rows={ranked} />
            <TrendingTable rows={ranked} />
          </>
        )}
      </Card>

      <div className="flex justify-end print:hidden">
        <Button type="button" variant="brand" onClick={() => window.print()}>
          <Icon name="printer" className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

/** "Nice" axis steps: 0 up to a round max a bit above the top value. */
function axisTicks(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => Math.max(1, m * mag)).find((s) => s >= raw) ?? raw;
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
}

/**
 * Ranked horizontal bars, one series (the card title names it, so no legend).
 * Bars start at the zero line with a rounded data end; the value sits at the
 * end of each bar in text ink; hovering a row shows its details.
 */
function TrendingChart({ rows }: { rows: TrendingRow[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const ticks = axisTicks(rows[0]?.qty ?? 0);
  const top = ticks[ticks.length - 1] || 1;

  return (
    <figure aria-label="Top trending products by total units sold" className="flex flex-col gap-1">
      <ol className="relative">
        {rows.map((r, i) => {
          const pct = (r.qty / top) * 100;
          const on = hover === r.sku;
          return (
            <li
              key={r.sku}
              onMouseEnter={() => setHover(r.sku)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(r.sku)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              className={cn("grid h-11 grid-cols-[minmax(120px,32%)_1fr] items-center gap-x-4 rounded-md outline-none", on && "bg-surface")}
            >
              <span className="flex min-w-0 items-center gap-2 pl-2 text-[13px]">
                <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                <span className="truncate" title={r.label}>
                  {r.name} <span className="font-mono text-xs text-muted">{r.sku}</span>
                </span>
              </span>
              {/* the right margin keeps room for the value label at the end of the longest bar */}
              <span className="relative mr-16 flex h-full items-center">
                {/* zero baseline and tick lines, repeated per row so they line up exactly */}
                {ticks.map((t) => (
                  <span key={t} aria-hidden className="absolute top-0 h-full border-l border-line" style={{ left: `${(t / top) * 100}%` }} />
                ))}
                <span
                  className={cn("relative h-5 rounded-r-[4px] transition-colors", on ? "bg-brand-600" : "bg-brand-500")}
                  style={{ width: `max(${pct}%, 3px)` }}
                />
                <span
                  className="absolute whitespace-nowrap pl-2 text-xs font-medium tabular-nums text-foreground"
                  style={{ left: `max(${pct}%, 3px)` }}
                >
                  {qtyFmt(r.qty)} {r.unit}
                </span>
                {on && (
                  <span
                    role="tooltip"
                    className="absolute bottom-full z-10 mb-1 w-max max-w-72 rounded-lg border border-line bg-background px-3 py-2 text-xs shadow-lg shadow-navy-950/10"
                    style={{ left: `min(${pct}%, calc(100% - 12rem))` }}
                  >
                    <span className="block font-medium text-foreground">{r.label}</span>
                    <span className="mt-0.5 block text-muted">
                      Total unit sold: <b className="tabular-nums text-foreground">{qtyFmt(r.qty)}</b> · in {r.invoices} invoice{r.invoices === 1 ? "" : "s"}
                    </span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-[minmax(120px,32%)_1fr] gap-x-4">
        <span />
        <span className="relative mr-16 h-5 text-[11px] tabular-nums text-muted">
          {ticks.map((t, i) => (
            <span
              key={t}
              className={cn("absolute top-1", i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
              style={{ left: `${(t / top) * 100}%` }}
            >
              {qtyFmt(t)}
            </span>
          ))}
        </span>
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted">Total unit sold</figcaption>
    </figure>
  );
}

/** The same numbers as a table, for reading exact values and for print. */
function TrendingTable({ rows }: { rows: TrendingRow[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface text-xs text-muted">
            <th className="w-12 px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 text-right font-medium">Invoices</th>
            <th className="px-3 py-2 text-right font-medium">Total unit sold</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.sku} className="border-b border-line last:border-0">
              <td className="px-3 py-2 text-muted">{i + 1}</td>
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.invoices}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">
                {qtyFmt(r.qty)} {r.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(filterClass, "appearance-none px-3 pr-9", value ? "border-brand-500/60" : "border-line")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
