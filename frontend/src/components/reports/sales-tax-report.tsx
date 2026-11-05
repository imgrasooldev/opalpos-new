"use client";

/**
 * Reports -> Sales tax report, as in the old Opal POS: for a business
 * location and date range (applied with "Report"), one row per tax with its
 * rate, the tax collected and the revenue it was charged on (excl. tax),
 * plus "Export report" as CSV.
 *
 * Final sales count (POS included); returns take their tax and revenue back
 * off, so the figures match the Summary report.
 */

import { useMemo, useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import { taxRate } from "@/components/purchases/purchases-data";
import { saleTotals, sellReturnTotals, useSales, useSellReturns } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => USD.format(n + 0);
const round = (n: number) => Math.round(n * 100) / 100;

type Filters = { location: string; from: string; to: string };
// the old screen opens on the current year
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = { location: "", from: `${YEAR}-01-01`, to: `${YEAR}-12-31` };
const inRange = (iso: string, f: Filters) => (!f.from || iso.slice(0, 10) >= f.from) && (!f.to || iso.slice(0, 10) <= f.to);

type TaxRow = { name: string; code: string; rate: number; tax: number; revenue: number; invoices: number };

export function SalesTaxReport() {
  const hydrated = useHydrated();
  const sales = useSales();
  const returns = useSellReturns();
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);

  const rows = useMemo(() => {
    const f = applied;
    const atLocation = (loc: string) => !f.location || loc === f.location;
    const saleById = new Map(sales.map((s) => [s.id, s]));
    const byTax = new Map<string, TaxRow & { saleIds: Set<number> }>(
      TAXES.map((name) => [
        name,
        { name, code: name.replace(/\s*[\d.]+%$/, "") || "Tax", rate: taxRate(name) * 100, tax: 0, revenue: 0, invoices: 0, saleIds: new Set<number>() },
      ]),
    );
    for (const s of sales) {
      if (s.status !== "Final" || !s.orderTax || !atLocation(s.location) || !inRange(s.date, f)) continue;
      const row = byTax.get(s.orderTax);
      if (!row) continue;
      const t = saleTotals(s);
      row.tax += t.tax;
      row.revenue += t.subtotal - t.discount - t.points;
      row.saleIds.add(s.id);
    }
    for (const x of returns) {
      const parent = saleById.get(x.saleId);
      if (!x.tax || !parent || !atLocation(parent.location) || !inRange(x.date, f)) continue;
      const row = byTax.get(x.tax);
      if (!row) continue;
      const t = sellReturnTotals(x);
      row.tax -= t.tax;
      row.revenue -= t.net - t.discount;
    }
    return [...byTax.values()].map(
      (r): TaxRow => ({ name: r.name, code: r.code, rate: r.rate, tax: round(r.tax), revenue: round(r.revenue), invoices: r.saleIds.size }),
    );
  }, [applied, sales, returns]);

  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const totalTax = round(rows.reduce((t, r) => t + r.tax, 0));
  const totalRevenue = round(rows.reduce((t, r) => t + r.revenue, 0));

  function exportCsv() {
    downloadCsv(`sales-tax-report-${applied.from || "start"}-to-${applied.to || "today"}.csv`, [
      "Tax code,Rate,Tax,Revenue (excl. tax)",
      ...rows.map((r) => [r.code, `${r.rate}%`, r.tax.toFixed(2), r.revenue.toFixed(2)].join(",")),
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
          </h2>
        }
        className="print:hidden"
        bodyClassName="border-t border-line pt-4"
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Business location</span>
            <span className="relative">
              <Icon name="store" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <select
                aria-label="Business location"
                value={draft.location}
                onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                className={cn(filterClass, "appearance-none pl-9 pr-9", draft.location ? "border-brand-500/60" : "border-line")}
              >
                <option value="">All locations</option>
                {PRODUCT_LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </span>
          </label>
          <div className="flex min-w-72 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={draft.from}
                onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
                className={cn(filterClass, "min-w-0 border-line px-2")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={draft.to}
                onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
                className={cn(filterClass, "min-w-0 border-line px-2")}
              />
            </div>
          </div>
          <Button type="button" variant="brand" onClick={() => setApplied(draft)}>
            Report
          </Button>
        </div>
        {changed && <p className="mt-3 text-xs text-amber-600">Filters changed. Press Report to update the report.</p>}
      </Card>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Icon name="store" className="h-4 w-4 text-brand-500" />
                {applied.location || "All locations"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="h-4 w-4" />
                {period(applied)}
              </span>
            </p>
            <div className="flex gap-2 print:hidden">
              <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
                <Icon name="download" className="h-4 w-4" />
                Export report
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
                <Icon name="printer" className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Tax code</th>
                  <th className="px-4 py-3 text-right font-medium">Rate</th>
                  <th className="px-4 py-3 text-right font-medium">Tax</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue (excl. tax)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.code}</span>
                      <span className="ml-2 text-xs text-muted">
                        {r.invoices} invoice{r.invoices === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="rounded bg-surface px-1.5 py-0.5 text-xs">{r.rate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money(r.tax)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(r.revenue)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted">
                      No taxes are set up.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 1 && (
                <tfoot>
                  <tr className="border-t border-line bg-brand-50/70 font-semibold dark:bg-brand-900/40">
                    <td className="px-4 py-3" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-600 dark:text-brand-200">{money(totalTax)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(totalRevenue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="text-xs text-muted">Revenue is the taxed sales after discounts and Opal points, with returns taken off.</p>
        </section>
      )}
    </div>
  );
}

function period(f: Filters) {
  const fmt = (d: string) => new Date(`${d}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (f.from && f.to) return `${fmt(f.from)} - ${fmt(f.to)}`;
  if (f.from) return `From ${fmt(f.from)}`;
  if (f.to) return `Up to ${fmt(f.to)}`;
  return "All dates";
}

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";
