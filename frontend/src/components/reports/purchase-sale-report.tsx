"use client";

/**
 * Reports -> Purchase & sale, as in the old Opal POS: a location picker and
 * "Filter by date" (quick ranges or a custom one), then
 *   - Purchases: total purchase (excl. tax), purchase including tax, total
 *     purchase return including tax, purchase due
 *   - Sales: total sale (excl. tax), sale including tax, total sell return
 *     including tax, sale due
 *   - Overall: (sale - sell return) - (purchase - purchase return), and the
 *     due amount worked out the same way
 *
 * Only final sales count (POS included). A sale due below zero means
 * customers paid more than the bills (change still to hand back).
 */

import { useMemo, useState, type ReactNode } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { returnTotals, usePurchaseReturns } from "@/components/purchases/purchase-returns-data";
import { totals, usePurchases } from "@/components/purchases/purchases-data";
import { saleTotals, sellReturnTotals, useSales, useSellReturns } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => USD.format(Math.round(n * 100) / 100 + 0);

type Range = { from: string; to: string };
const iso = (d: Date) => {
  const local = new Date(d);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};
function preset(key: string): Range {
  const now = new Date();
  const day = (offset: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  switch (key) {
    case "today":
      return { from: day(0), to: day(0) };
    case "yesterday":
      return { from: day(-1), to: day(-1) };
    case "7":
      return { from: day(-6), to: day(0) };
    case "30":
      return { from: day(-29), to: day(0) };
    case "month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "lastMonth":
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "year":
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
    default:
      return { from: "", to: "" };
  }
}
const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "year", label: "This financial year" },
  { key: "all", label: "All time" },
];

export function PurchaseSaleReport() {
  const hydrated = useHydrated();
  const sales = useSales();
  const sellReturns = useSellReturns();
  const purchases = usePurchases();
  const purchaseReturns = usePurchaseReturns();
  const [location, setLocation] = useState("");
  // the old screen opens on the current financial year
  const [rangeKey, setRangeKey] = useState("year");
  const [range, setRange] = useState<Range>(() => preset("year"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [custom, setCustom] = useState<Range>(range);

  const r = useMemo(() => {
    const inRange = (d: string) => (!range.from || d.slice(0, 10) >= range.from) && (!range.to || d.slice(0, 10) <= range.to);
    const at = (loc: string) => !location || loc === location;
    const saleById = new Map(sales.map((s) => [s.id, s]));

    const p = purchases.filter((x) => at(x.location) && inRange(x.date)).map(totals);
    const pr = purchaseReturns.filter((x) => at(x.location) && inRange(x.date)).map(returnTotals);
    const s = sales.filter((x) => x.status === "Final" && at(x.location) && inRange(x.date)).map(saleTotals);
    const sr = sellReturns
      .filter((x) => {
        const parent = saleById.get(x.saleId);
        return parent && at(parent.location) && inRange(x.date);
      })
      .map(sellReturnTotals);
    const sum = <T,>(list: T[], pick: (t: T) => number) => list.reduce((t, x) => t + pick(x), 0);

    const purchase = {
      excl: sum(p, (t) => t.net - t.discount),
      incl: sum(p, (t) => t.total),
      returns: sum(pr, (t) => t.total),
      due: sum(p, (t) => t.due),
      returnDue: sum(pr, (t) => t.due),
      count: p.length,
    };
    const sale = {
      excl: sum(s, (t) => t.subtotal - t.discount - t.points),
      incl: sum(s, (t) => t.total),
      returns: sum(sr, (t) => t.total),
      due: sum(s, (t) => t.due),
      returnDue: sum(sr, (t) => t.due),
      count: s.length,
    };
    return {
      purchase,
      sale,
      overall: sale.incl - sale.returns - (purchase.incl - purchase.returns),
      overallDue: sale.due - sale.returnDue - (purchase.due - purchase.returnDue),
    };
  }, [location, range, sales, sellReturns, purchases, purchaseReturns]);

  const rangeLabel = rangeKey === "custom" ? `${fmt(range.from)} - ${fmt(range.to)}` : PRESETS.find((x) => x.key === rangeKey)?.label;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" className="h-4 w-4" />
            {range.from || range.to ? `${fmt(range.from)} - ${fmt(range.to)}` : "All dates"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative">
            <Icon name="store" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <select
              aria-label="Business location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={cn(
                "w-64 appearance-none rounded-lg border bg-background py-2 pl-9 pr-9 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
                location ? "border-brand-500/60" : "border-line",
              )}
            >
              <option value="">All locations</option>
              {PRODUCT_LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </span>

          <span className="relative">
            <Button type="button" variant="brand" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
              <Icon name="calendar" className="h-4 w-4" />
              {rangeLabel ?? "Filter by date"}
              <Icon name="chevron-down" className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-line bg-background p-1.5 shadow-lg shadow-navy-950/10">
                {PRESETS.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    onClick={() => {
                      setRangeKey(x.key);
                      setRange(preset(x.key));
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface",
                      rangeKey === x.key && "font-medium text-brand-600",
                    )}
                  >
                    {x.label}
                    {rangeKey === x.key && <Icon name="chevron-right" className="h-3.5 w-3.5" />}
                  </button>
                ))}
                <div className="mt-1 border-t border-line px-2 pb-1 pt-2.5">
                  <p className="mb-1.5 text-xs font-medium text-muted">Custom range</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      aria-label="From date"
                      value={custom.from}
                      onChange={(event) => setCustom((prev) => ({ ...prev, from: event.target.value }))}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-background px-2 py-1.5 text-xs outline-none focus:border-brand-500"
                    />
                    <input
                      type="date"
                      aria-label="To date"
                      value={custom.to}
                      onChange={(event) => setCustom((prev) => ({ ...prev, to: event.target.value }))}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-background px-2 py-1.5 text-xs outline-none focus:border-brand-500"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    className="mt-2 w-full justify-center"
                    onClick={() => {
                      setRangeKey("custom");
                      setRange(custom);
                      setMenuOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </span>
        </div>
      </div>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Block title="Purchases" icon="cart" tone="amber" count={`${r.purchase.count} purchase${r.purchase.count === 1 ? "" : "s"}`}>
              <Row label="Total purchase" note="Excl. tax, after discount" value={money(r.purchase.excl)} />
              <Row label="Purchase including tax" value={money(r.purchase.incl)} />
              <Row label="Total purchase return including tax" value={money(r.purchase.returns)} />
              <Row label="Purchase due" help="Still to pay suppliers for these purchases" value={money(r.purchase.due)} strong />
            </Block>
            <Block title="Sales" icon="chart" tone="blue" count={`${r.sale.count} invoice${r.sale.count === 1 ? "" : "s"}`}>
              <Row label="Total sale" note="Excl. tax, after discounts and points" value={money(r.sale.excl)} />
              <Row label="Sale including tax" value={money(r.sale.incl)} />
              <Row label="Total sell return including tax" value={money(r.sale.returns)} />
              <Row
                label="Sale due"
                help="Still to collect from customers. Below zero means customers paid more than the bills."
                value={money(r.sale.due)}
                strong
              />
            </Block>
          </div>

          <section className="overflow-hidden rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
            <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold">Overall</h2>
              <span className="text-[13px] text-muted">(Sale - Sell return) - (Purchase - Purchase return)</span>
              <span title="Sale and purchase amounts include tax." className="text-brand-500">
                <Icon name="info" className="h-4 w-4" />
              </span>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-surface px-5 py-4">
                <p className="text-[13px] text-muted">Sale - Purchase</p>
                <p className={cn("mt-1 text-2xl font-semibold tabular-nums", r.overall < 0 ? "text-rose-600" : "text-emerald-600")}>{money(r.overall)}</p>
                <p className="mt-1 text-xs text-muted">
                  {money(r.sale.incl - r.sale.returns)} sold - {money(r.purchase.incl - r.purchase.returns)} bought
                </p>
              </div>
              <div className="rounded-xl bg-surface px-5 py-4">
                <p className="text-[13px] text-muted">Due amount</p>
                <p className={cn("mt-1 text-2xl font-semibold tabular-nums", r.overallDue < 0 ? "text-rose-600" : "text-foreground")}>{money(r.overallDue)}</p>
                <p className="mt-1 text-xs text-muted">
                  {money(r.sale.due - r.sale.returnDue)} sale due - {money(r.purchase.due - r.purchase.returnDue)} purchase due
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end print:hidden">
            <Button type="button" variant="brand" onClick={() => window.print()}>
              <Icon name="printer" className="h-4 w-4" />
              Print
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const fmt = (d: string) => (d ? new Date(`${d}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "…");

const TONES = {
  blue: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
};

function Block({ title, icon, tone, count, children }: { title: string; icon: IconName; tone: keyof typeof TONES; count: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONES[tone])}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
          {title}
        </h2>
        <span className="text-xs text-muted">{count}</span>
      </header>
      <dl>{children}</dl>
    </section>
  );
}

function Row({ label, note, help, value, strong }: { label: string; note?: string; help?: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-3 text-[13px] last:border-0", strong && "bg-surface")}>
      <dt className={cn(strong ? "font-semibold" : "text-zinc-700 dark:text-zinc-300")}>
        <span className="flex items-center gap-1.5">
          {label}
          {help && (
            <span title={help} className="text-brand-500">
              <Icon name="info" className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        {note && <span className="mt-0.5 block text-[11.5px] font-normal text-muted">{note}</span>}
      </dt>
      <dd className={cn("whitespace-nowrap tabular-nums", strong ? "font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}
