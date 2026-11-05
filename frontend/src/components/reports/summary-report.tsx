"use client";

/**
 * Reports -> Summary report, as in the old Opal POS: for a business location
 * and date range (applied with "Report"),
 *   - sales: gross sales, discounts, Opal points, refunded amount, net
 *     sales, tax and collected amount
 *   - nontaxable / taxable sales, tips, takings per payment method
 *   - inventory price totals (current stock at purchase and selling price)
 *   - cash drawer: beginning cash, cash sales, cash refunds, cash paid out /
 *     expenses and the cash in the drawer
 *   - cashier summary: each cashier's invoices and takings
 *
 * Net sales = gross - discounts - points - refunds; collected = net + tax.
 * Only final sales count (POS included); drafts and quotations don't.
 */

import { useMemo, useState, type ReactNode } from "react";

import { useExpenses } from "@/components/expenses/expenses-data";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { taxRate } from "@/components/purchases/purchases-data";
import { SALE_PAYMENT_METHODS, saleTotals, sellReturnTotals, useSales, useSellReturns } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => USD.format(n + 0);
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Cash each drawer opens with. Stand-in for the cash register's opening
 * amount until registers are wired up.
 */
const OPENING_CASH: Record<string, number> = { "GR Store": 150, "City Outlet": 70 };

type Filters = { location: string; from: string; to: string };
// the old screen opens on the current year
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = { location: "", from: `${YEAR}-01-01`, to: `${YEAR}-12-31` };

const inRange = (iso: string, f: Filters) => (!f.from || iso.slice(0, 10) >= f.from) && (!f.to || iso.slice(0, 10) <= f.to);

export function SummaryReport() {
  const hydrated = useHydrated();
  const sales = useSales();
  const returns = useSellReturns();
  const expenses = useExpenses();
  const [products] = useDemoProducts();
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);

  const r = useMemo(() => {
    const f = applied;
    const atLocation = (loc: string) => !f.location || loc === f.location;
    const final = sales.filter((s) => s.status === "Final" && atLocation(s.location));
    const inPeriod = final.filter((s) => inRange(s.date, f));
    const saleById = new Map(sales.map((s) => [s.id, s]));
    const rets = returns.filter((x) => {
      const parent = saleById.get(x.saleId);
      return parent && atLocation(parent.location) && inRange(x.date, f);
    });

    let gross = 0, discounts = 0, points = 0, tax = 0, taxable = 0, nontaxable = 0;
    for (const s of inPeriod) {
      const t = saleTotals(s);
      gross += t.subtotal;
      discounts += t.discount;
      points += t.points;
      tax += t.tax;
      const net = t.subtotal - t.discount - t.points;
      if (taxRate(s.orderTax) > 0) taxable += net;
      else nontaxable += net;
    }
    let refunded = 0;
    for (const x of rets) {
      const t = sellReturnTotals(x);
      const net = t.net - t.discount;
      refunded += net;
      tax -= t.tax;
      if (taxRate(x.tax) > 0) taxable -= net;
      else nontaxable -= net;
    }
    const netSales = gross - discounts - points - refunded;

    // takings by method: sale payments made in the period
    const payments = final.flatMap((s) => s.payments.filter((p) => inRange(p.date, f)).map((p) => ({ ...p, sale: s })));
    const byMethod = SALE_PAYMENT_METHODS.map((m) => ({
      method: m,
      amount: round(payments.filter((p) => p.method === m).reduce((t, p) => t + p.amount, 0)),
    })).filter((m) => m.amount !== 0 || m.method === "Cash" || m.method === "Card");

    // change is what a cash payment went over the sale total
    const cashReceived = payments.filter((p) => p.method === "Cash").reduce((t, p) => t + p.amount, 0);
    const changeGiven = inPeriod.reduce((t, s) => t + Math.max(0, saleTotals(s).paid - saleTotals(s).total), 0);
    const cashSales = cashReceived - changeGiven;
    const cashRefunds = returns
      .filter((x) => {
        const parent = saleById.get(x.saleId);
        return parent && atLocation(parent.location);
      })
      .flatMap((x) => x.refunds)
      .filter((p) => p.method === "Cash" && inRange(p.date, f))
      .reduce((t, p) => t + p.amount, 0);
    const cashExpenses = expenses
      .filter((e) => atLocation(e.location))
      .flatMap((e) => e.payments.filter((p) => p.method === "Cash" && inRange(p.date, f)).map((p) => (e.isRefund ? -p.amount : p.amount)))
      .reduce((t, n) => t + n, 0);
    const beginning = f.location ? (OPENING_CASH[f.location] ?? 0) : Object.values(OPENING_CASH).reduce((t, n) => t + n, 0);

    // stock value today; stock is one total per product, so a location means "products kept there"
    let purchaseValue = 0, sellingValue = 0;
    for (const p of products) {
      if (p.manageStock === false || (f.location && !p.locations.includes(f.location))) continue;
      const units = p.variations.length
        ? p.variations.map((v) => ({ stock: v.stock, cost: v.purchasePrice ?? p.purchasePrice, price: v.sellingPrice ?? p.sellingPrice }))
        : [{ stock: p.stock, cost: p.purchasePrice, price: p.sellingPrice }];
      for (const u of units) {
        purchaseValue += Math.max(0, u.stock) * u.cost;
        sellingValue += Math.max(0, u.stock) * u.price;
      }
    }

    const cashiers = [...new Set(inPeriod.map((s) => s.addedBy))]
      .map((name) => {
        const own = inPeriod.filter((s) => s.addedBy === name);
        const paid = own.flatMap((s) => s.payments);
        return {
          name,
          invoices: own.length,
          total: round(own.reduce((t, s) => t + saleTotals(s).total, 0)),
          cash: round(paid.filter((p) => p.method === "Cash").reduce((t, p) => t + p.amount, 0)),
          card: round(paid.filter((p) => p.method === "Card").reduce((t, p) => t + p.amount, 0)),
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      gross: round(gross),
      discounts: round(discounts),
      points: round(points),
      refunded: round(refunded),
      netSales: round(netSales),
      tax: round(tax),
      collected: round(netSales + tax),
      taxable: round(taxable),
      nontaxable: round(nontaxable),
      byMethod,
      beginning,
      cashReceived: round(cashReceived),
      changeGiven: round(changeGiven),
      cashSales: round(cashSales),
      cashRefunds: round(cashRefunds),
      cashExpenses: round(cashExpenses),
      inDrawer: round(beginning + cashSales - cashRefunds - cashExpenses),
      purchaseValue: round(purchaseValue),
      sellingValue: round(sellingValue),
      cashiers,
      invoices: inPeriod.length,
    };
  }, [applied, sales, returns, expenses, products]);

  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const where = applied.location || "All locations";

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
        {changed && <p className="mt-3 text-xs text-amber-600">Filters changed. Press Report to update the summary.</p>}
      </Card>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Icon name="store" className="h-4 w-4 text-brand-500" />
                {where}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="h-4 w-4" />
                {period(applied)}
              </span>
              <span>
                {r.invoices} invoice{r.invoices === 1 ? "" : "s"}
              </span>
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
              <Icon name="printer" className="h-4 w-4" />
              Print
            </Button>
          </div>

          <Group>
            <Row label="Gross sales" value={money(r.gross)} />
            <Row label="Discounts" value={money(r.discounts)} sign="-" />
            <Row label="Opal points" value={money(r.points)} sign="-" />
            <Row label="Refunded amount" value={money(r.refunded)} sign="-" />
            <Row label="Net sales" value={money(r.netSales)} tone="total" />
            <Row label="Tax" tag="8.25%" value={money(r.tax)} sign="+" />
            <Row label="Collected amount" value={money(r.collected)} tone="grand" />
          </Group>

          <Group>
            <Row label="Nontaxable sales" value={money(r.nontaxable)} />
            <Row label="Taxable sales" value={money(r.taxable)} />
          </Group>

          <Group>
            <Row label="Tip" value={money(0)} note="Tips are added from the POS screen" />
          </Group>

          <Group>
            {r.byMethod.map((m) => (
              <Row key={m.method} label={m.method} value={money(m.amount)} />
            ))}
          </Group>

          <Group title="Inventory price totals" hint="Current stock, valued today">
            <Row label="Total unit purchase price" value={money(r.purchaseValue)} />
            <Row label="Total selling price" value={money(r.sellingValue)} />
          </Group>

          <Group title="Cash drawer report">
            <Row label="Beginning cash" value={money(r.beginning)} note="Opening amount of the cash register" />
            <Row
              label="Cash sales"
              value={money(r.cashSales)}
              sign="+"
              note={`Cash received ${money(r.cashReceived)} - change given ${money(r.changeGiven)}`}
            />
            <Row label="Cash refunds" value={money(r.cashRefunds)} sign="-" />
            <Row label="Cash paid out / expenses" value={money(r.cashExpenses)} sign="-" />
            <Row label="Cash in drawer" value={money(r.inDrawer)} tone="grand" />
          </Group>

          <Group title="Cashier summary" plain>
            {r.cashiers.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-muted">No cashier data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-surface text-xs text-muted">
                      <th className="px-4 py-2.5 font-medium">Cashier</th>
                      <th className="px-4 py-2.5 text-right font-medium">Invoices</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cash</th>
                      <th className="px-4 py-2.5 text-right font-medium">Card</th>
                      <th className="px-4 py-2.5 text-right font-medium">Total sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.cashiers.map((c) => (
                      <tr key={c.name} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600 dark:bg-brand-900 dark:text-brand-200">
                              {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                            </span>
                            <span className="font-medium">{c.name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{c.invoices}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(c.cash)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(c.card)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Group>
        </div>
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

/** One block of the old report: an optional heading above a bordered list of rows. */
function Group({ title, hint, plain, children }: { title?: string; hint?: string; plain?: boolean; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title && (
        <header className="flex items-baseline justify-between gap-2 px-1 pt-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </header>
      )}
      <div className="overflow-hidden rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
        {plain ? children : <dl>{children}</dl>}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  note,
  tag,
  sign,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tag?: string;
  /** Added to (+) or taken off (-) the running total. */
  sign?: "+" | "-";
  /** total = a subtotal row; grand = the bottom line of the block. */
  tone?: "total" | "grand";
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-4 py-3 text-[13px] last:border-0",
        tone === "total" && "bg-surface",
        tone === "grand" && "bg-brand-50/70 dark:bg-brand-900/40",
      )}
    >
      <dt className={cn(tone ? "font-semibold" : "text-zinc-700 dark:text-zinc-300")}>
        <span className="flex items-center gap-2">
          {label}
          {tag && <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-normal text-muted">{tag}</span>}
        </span>
        {note && <span className="mt-0.5 block text-[11.5px] font-normal text-muted">{note}</span>}
      </dt>
      <dd
        className={cn(
          "whitespace-nowrap tabular-nums",
          tone === "grand" ? "text-[15px] font-semibold text-brand-600 dark:text-brand-200" : tone ? "font-semibold" : "font-medium",
        )}
      >
        {sign && <span className={cn("mr-1.5 text-xs font-normal", sign === "+" ? "text-emerald-600" : "text-rose-600")}>({sign})</span>}
        {value}
      </dd>
    </div>
  );
}

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";
