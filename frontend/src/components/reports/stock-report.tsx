"use client";

/**
 * Reports -> Stock report, as in the old Opal POS, with two tabs:
 *   - Stock report: filters (business location, category, sub category,
 *     brand, unit), the closing stock totals (by purchase and by sale price,
 *     potential profit, profit margin) and one row per product / variation
 *     with its current stock, stock value, units sold, transferred and
 *     adjusted (taken from the product's stock history)
 *   - Stock adjustment report: location and date range, the normal /
 *     abnormal / total adjustment and amount recovered, and the adjustments
 *
 * Stock is one total per product, so a location filter means "products kept
 * at that location".
 */

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { useBrands } from "@/components/inventory/brands";
import { useCategories } from "@/components/inventory/categories";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { historyFor } from "@/components/inventory/stock-history";
import { useUnits } from "@/components/inventory/units";
import { adjustmentTotals, useAdjustments, type StockAdjustment } from "@/components/stock-adjustments/adjustments-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => USD.format(Math.round(n * 100) / 100 + 0);
const qty = (n: number) => (n + 0).toFixed(2);
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

type Tab = "stock" | "adjustment";

export function StockReport() {
  const [tab, setTab] = useState<Tab>("stock");
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="scrollbar-none flex overflow-x-auto rounded-xl border border-line bg-background px-2 print:hidden">
        {(
          [
            { key: "stock", label: "Stock report", icon: "cube" },
            { key: "adjustment", label: "Stock adjustment report", icon: "sliders" },
          ] as { key: Tab; label: string; icon: IconName }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[13px] transition-colors",
              tab === t.key ? "font-medium text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
            {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "stock" ? <StockTab /> : <AdjustmentTab />}</div>
    </div>
  );
}

// ---------- stock report ----------

type StockRow = {
  key: string;
  productId: number;
  sku: string;
  product: string;
  variation: string;
  category: string;
  location: string;
  unit: string;
  sellingPrice: number;
  stock: number;
  valueCost: number;
  valueSale: number;
  sold: number;
  transferred: number;
  adjusted: number;
  managed: boolean;
};

type StockFilters = { location: string; category: string; subCategory: string; brand: string; unit: string };
const NO_STOCK_FILTERS: StockFilters = { location: "", category: "", subCategory: "", brand: "", unit: "" };

function StockTab() {
  const hydrated = useHydrated();
  const [products] = useDemoProducts();
  const categories = useCategories();
  const brands = useBrands();
  const units = useUnits();
  const [filters, setFilters] = useState<StockFilters>(NO_STOCK_FILTERS);

  const parents = categories.filter((c) => c.parentId === null);
  const parentId = parents.find((c) => c.name === filters.category)?.id;
  const subs = categories.filter((c) => c.parentId !== null && c.parentId === parentId);

  const rows = useMemo(() => {
    const f = filters;
    return products
      .filter(
        (p) =>
          (!f.location || p.locations.includes(f.location)) &&
          (!f.category || p.category === f.category) &&
          (!f.subCategory || p.subCategory === f.subCategory) &&
          (!f.brand || p.brand === f.brand) &&
          (!f.unit || p.unit === f.unit),
      )
      .flatMap((p) => {
        const units = p.variations.length
          ? p.variations.map((v) => ({ sku: v.sku, variation: v.name, stock: v.stock, cost: v.purchasePrice ?? p.purchasePrice, price: v.sellingPrice ?? p.sellingPrice }))
          : [{ sku: p.sku, variation: "", stock: p.stock, cost: p.purchasePrice, price: p.sellingPrice }];
        return units.map((u): StockRow => {
          const history = historyFor(p, u.sku);
          const net = (type: string) => -history.filter((h) => h.type === type).reduce((t, h) => t + h.qty, 0);
          const managed = p.manageStock !== false;
          const stock = managed ? u.stock : 0;
          return {
            key: u.sku,
            productId: p.id,
            sku: u.sku,
            product: p.name,
            variation: u.variation,
            category: p.category ?? "",
            location: p.locations.join(", "),
            unit: p.unit,
            sellingPrice: u.price,
            stock,
            valueCost: Math.max(0, stock) * u.cost,
            valueSale: Math.max(0, stock) * u.price,
            sold: net("Sell"),
            transferred: net("Stock transfer (out)"),
            adjusted: net("Stock adjustment"),
            managed,
          };
        });
      });
  }, [filters, products]);

  const closingCost = rows.reduce((t, r) => t + r.valueCost, 0);
  const closingSale = rows.reduce((t, r) => t + r.valueSale, 0);
  const profit = closingSale - closingCost;
  const active = Object.values(filters).filter(Boolean).length;
  const set = <K extends keyof StockFilters>(key: K, value: StockFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === "category" ? { subCategory: "" } : {}) }));

  const sumCol = (pick: (r: StockRow) => number, fmt: (n: number) => string) =>
    function ColumnTotal(list: StockRow[]) {
      return <span className="tabular-nums">{fmt(list.reduce((t, r) => t + pick(r), 0))}</span>;
    };
  const columns: DataColumn<StockRow>[] = [
    { key: "sku", label: "SKU", sortValue: (r) => r.sku, text: (r) => r.sku, render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    {
      key: "product",
      label: "Product",
      sortValue: (r) => r.product,
      text: (r) => r.product,
      render: (r) => (
        <Link href={`/products/${r.productId}/stock-history`} className="font-medium hover:text-brand-500 hover:underline">
          {r.product}
        </Link>
      ),
    },
    { key: "variation", label: "Variation", sortValue: (r) => r.variation, text: (r) => r.variation, render: (r) => r.variation || <span className="text-muted">-</span> },
    { key: "category", label: "Category", sortValue: (r) => r.category, text: (r) => r.category, render: (r) => r.category || <span className="text-muted">-</span> },
    { key: "location", label: "Location", sortValue: (r) => r.location, text: (r) => r.location, render: (r) => r.location || <span className="text-muted">-</span> },
    { key: "price", label: "Unit selling price", sortValue: (r) => r.sellingPrice, text: (r) => r.sellingPrice.toFixed(2), render: (r) => <span className="tabular-nums">{money(r.sellingPrice)}</span>, align: "right" },
    {
      key: "stock",
      label: "Current stock",
      sortValue: (r) => r.stock,
      text: (r) => (r.managed ? qty(r.stock) : "Not managed"),
      render: (r) =>
        !r.managed ? (
          <span className="text-xs text-muted">Not managed</span>
        ) : (
          <span className={cn("tabular-nums", r.stock <= 0 && "font-medium text-rose-600")}>
            {qty(r.stock)} <span className="text-xs text-muted">{r.unit}</span>
          </span>
        ),
      align: "right",
      total: sumCol((r) => r.stock, qty),
    },
    {
      key: "valueCost",
      label: "Stock value (by purchase price)",
      sortValue: (r) => r.valueCost,
      text: (r) => r.valueCost.toFixed(2),
      render: (r) => <span className="tabular-nums">{money(r.valueCost)}</span>,
      align: "right",
      total: sumCol((r) => r.valueCost, money),
    },
    {
      key: "valueSale",
      label: "Stock value (by sale price)",
      sortValue: (r) => r.valueSale,
      text: (r) => r.valueSale.toFixed(2),
      render: (r) => <span className="tabular-nums">{money(r.valueSale)}</span>,
      align: "right",
      total: sumCol((r) => r.valueSale, money),
    },
    {
      key: "profit",
      label: "Potential profit",
      sortValue: (r) => r.valueSale - r.valueCost,
      text: (r) => (r.valueSale - r.valueCost).toFixed(2),
      render: (r) => <span className="font-medium tabular-nums text-emerald-600">{money(r.valueSale - r.valueCost)}</span>,
      align: "right",
      total: sumCol((r) => r.valueSale - r.valueCost, money),
    },
    { key: "sold", label: "Total unit sold", sortValue: (r) => r.sold, text: (r) => qty(r.sold), render: (r) => <span className="tabular-nums">{qty(r.sold)}</span>, align: "right", total: sumCol((r) => r.sold, qty) },
    {
      key: "transferred",
      label: "Total unit transferred",
      sortValue: (r) => r.transferred,
      text: (r) => qty(r.transferred),
      render: (r) => <span className="tabular-nums">{qty(r.transferred)}</span>,
      align: "right",
      total: sumCol((r) => r.transferred, qty),
    },
    {
      key: "adjusted",
      label: "Total unit adjusted",
      sortValue: (r) => r.adjusted,
      text: (r) => qty(r.adjusted),
      render: (r) => <span className="tabular-nums">{qty(r.adjusted)}</span>,
      align: "right",
      total: sumCol((r) => r.adjusted, qty),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FilterCard active={active} onReset={() => setFilters(NO_STOCK_FILTERS)}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect label="Business location" icon="store" value={filters.location} onChange={(v) => set("location", v)} options={[{ value: "", label: "All locations" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]} />
          <FilterSelect label="Category" icon="tag" value={filters.category} onChange={(v) => set("category", v)} options={[{ value: "", label: "All" }, ...parents.map((c) => ({ value: c.name, label: c.name }))]} />
          <FilterSelect label="Sub category" icon="tag" value={filters.subCategory} onChange={(v) => set("subCategory", v)} options={[{ value: "", label: "All" }, ...subs.map((c) => ({ value: c.name, label: c.name }))]} />
          <FilterSelect label="Brand" icon="cube" value={filters.brand} onChange={(v) => set("brand", v)} options={[{ value: "", label: "All" }, ...brands.map((b) => ({ value: b.name, label: b.name }))]} />
          <FilterSelect label="Unit" icon="grid" value={filters.unit} onChange={(v) => set("unit", v)} options={[{ value: "", label: "All" }, ...units.map((u) => ({ value: u.shortName, label: `${u.name} (${u.shortName})` }))]} />
        </div>
      </FilterCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="dollar" tone="amber" label="Closing stock (by purchase price)" value={hydrated ? money(closingCost) : "…"} />
        <Stat icon="tag" tone="blue" label="Closing stock (by sale price)" value={hydrated ? money(closingSale) : "…"} />
        <Stat icon="trend-up" tone="green" label="Potential profit" value={hydrated ? money(profit) : "…"} />
        <Stat icon="chart" tone="blue" label="Profit margin %" value={hydrated ? `${closingSale > 0 ? ((profit / closingSale) * 100).toFixed(2) : "0.00"}%` : "…"} />
      </div>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <DataTable
          title="Stock report"
          subtitle={`${rows.length} products and variations · out of stock rows are marked in red`}
          rows={rows}
          columns={columns}
          rowKey={(r) => r.key}
          defaultSort={{ key: "valueCost", direction: "desc" }}
          defaultPageSize={100}
          noun="products"
          exportName="stock-report"
          minWidth={1500}
          rowClassName={(r) => (r.managed && r.stock <= 0 ? "bg-rose-50/60 dark:bg-rose-950/30" : undefined)}
        />
      )}
    </div>
  );
}

// ---------- stock adjustment report ----------

type AdjFilters = { location: string; from: string; to: string };
const YEAR = new Date().getFullYear();
const DEFAULT_ADJ: AdjFilters = { location: "", from: `${YEAR}-01-01`, to: `${YEAR}-12-31` };

function AdjustmentTab() {
  const hydrated = useHydrated();
  const adjustments = useAdjustments();
  const [filters, setFilters] = useState<AdjFilters>(DEFAULT_ADJ);

  const rows = adjustments.filter(
    (a) =>
      (!filters.location || a.location === filters.location) &&
      (!filters.from || a.date.slice(0, 10) >= filters.from) &&
      (!filters.to || a.date.slice(0, 10) <= filters.to),
  );
  const total = (type?: StockAdjustment["type"]) => rows.filter((a) => !type || a.type === type).reduce((t, a) => t + adjustmentTotals(a).total, 0);
  const recovered = rows.reduce((t, a) => t + a.recovered, 0);
  const active = Object.entries(filters).filter(([k, v]) => v !== DEFAULT_ADJ[k as keyof AdjFilters]).length;

  const columns: DataColumn<StockAdjustment>[] = [
    { key: "date", label: "Date", sortValue: (a) => a.date, text: (a) => when(a.date), render: (a) => <span className="whitespace-nowrap">{when(a.date)}</span> },
    { key: "ref", label: "Reference no", sortValue: (a) => a.ref, text: (a) => a.ref, render: (a) => <span className="font-mono text-[12.5px] font-medium">{a.ref}</span> },
    { key: "location", label: "Location", sortValue: (a) => a.location, text: (a) => a.location },
    {
      key: "type",
      label: "Adjustment type",
      sortValue: (a) => a.type,
      text: (a) => a.type,
      render: (a) => <Badge tone={a.type === "Normal" ? "blue" : "rose"}>{a.type}</Badge>,
    },
    {
      key: "items",
      label: "Products",
      sortValue: (a) => a.lines.length,
      text: (a) => a.lines.map((l) => `${l.name} x${l.qty}`).join("; "),
      render: (a) => (
        <span className="block max-w-72 truncate text-muted" title={a.lines.map((l) => `${l.name} x ${l.qty}`).join(", ")}>
          {a.lines.map((l) => `${l.name} × ${l.qty}`).join(", ")}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total amount",
      sortValue: (a) => adjustmentTotals(a).total,
      text: (a) => adjustmentTotals(a).total.toFixed(2),
      render: (a) => <span className="font-medium tabular-nums">{money(adjustmentTotals(a).total)}</span>,
      align: "right",
      total: (list) => <span className="tabular-nums">{money(list.reduce((t, a) => t + adjustmentTotals(a).total, 0))}</span>,
    },
    {
      key: "recovered",
      label: "Total amount recovered",
      sortValue: (a) => a.recovered,
      text: (a) => a.recovered.toFixed(2),
      render: (a) => <span className="tabular-nums">{money(a.recovered)}</span>,
      align: "right",
      total: (list) => <span className="tabular-nums">{money(list.reduce((t, a) => t + a.recovered, 0))}</span>,
    },
    { key: "reason", label: "Reason", sortValue: (a) => a.reason, text: (a) => a.reason, render: (a) => a.reason || <span className="text-muted">-</span> },
    { key: "addedBy", label: "Added by", sortValue: (a) => a.addedBy, text: (a) => a.addedBy },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FilterCard active={active} onReset={() => setFilters(DEFAULT_ADJ)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FilterSelect
            label="Business location"
            icon="store"
            value={filters.location}
            onChange={(v) => setFilters((prev) => ({ ...prev, location: v }))}
            options={[{ value: "", label: "All locations" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} className={cn(filterClass, "min-w-0 border-line px-2")} />
              <span className="text-xs text-muted">to</span>
              <input type="date" aria-label="To date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} className={cn(filterClass, "min-w-0 border-line px-2")} />
            </div>
          </div>
        </div>
      </FilterCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="sliders" tone="blue" label="Total normal" value={hydrated ? money(total("Normal")) : "…"} />
        <Stat icon="alert" tone="rose" label="Total abnormal" value={hydrated ? money(total("Abnormal")) : "…"} />
        <Stat icon="cube" tone="amber" label="Total stock adjustment" value={hydrated ? money(total()) : "…"} />
        <Stat icon="refund" tone="green" label="Total amount recovered" value={hydrated ? money(recovered) : "…"} />
      </div>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <DataTable
          title="Stock adjustments"
          subtitle={`${rows.length} adjustment${rows.length === 1 ? "" : "s"}`}
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          defaultSort={{ key: "date", direction: "desc" }}
          defaultPageSize={100}
          noun="adjustments"
          exportName="stock-adjustment-report"
          minWidth={1100}
        />
      )}
    </div>
  );
}

// ---------- shared pieces ----------

const TONES = {
  blue: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
};

function Stat({ icon, tone, label, value }: { icon: IconName; tone: keyof typeof TONES; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-background p-4 shadow-sm shadow-navy-950/[0.03]">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function FilterCard({ active, onReset, children }: { active: number; onReset: () => void; children: ReactNode }) {
  return (
    <Card
      title={
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="filter" className="h-4 w-4 text-brand-500" />
          Filters
          {active > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">{active}</span>}
        </h2>
      }
      action={
        active > 0 && (
          <button type="button" onClick={onReset} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
            Reset filters
          </button>
        )
      }
      className="print:hidden"
      bodyClassName="border-t border-line pt-4"
    >
      {children}
    </Card>
  );
}

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

function FilterSelect({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(filterClass, "appearance-none pl-9 pr-9", value ? "border-brand-500/60" : "border-line")}
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
