"use client";

/**
 * Reports -> Product sell report, as in the old Opal POS: filters (search
 * product, customer, customer group, business location, category, brand,
 * date range, time range) and five views of the same sold lines:
 *   - Detailed: one row per line sold
 *   - Detailed (with purchase): the same lines with their purchase cost and profit
 *   - Grouped: one row per product / variation, with its current stock
 *   - By category / By brand: units sold and the total per category or brand
 *
 * Final sales only (POS included). The tax column is the line tax; order tax
 * is charged on the whole sale and shows in the Sales tax report.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { CUSTOMER_GROUPS } from "@/components/contacts/customers-data";
import { useBrands } from "@/components/inventory/brands";
import { useCategories } from "@/components/inventory/categories";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { lineSubtotal, netUnitPrice, useSales } from "@/components/sales/sales-data";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (n: number) => USD.format(n + 0);
const qty = (n: number) => n.toFixed(2);
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

type Filters = {
  search: string;
  customer: string;
  group: string;
  location: string;
  category: string;
  brand: string;
  from: string;
  to: string;
  timeFrom: string;
  timeTo: string;
};
// the old screen opens on the current year, the whole day
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = {
  search: "",
  customer: "",
  group: "",
  location: "",
  category: "",
  brand: "",
  from: `${YEAR}-01-01`,
  to: `${YEAR}-12-31`,
  timeFrom: "00:00",
  timeTo: "23:59",
};

type Line = {
  key: string;
  productId: number;
  product: string;
  sku: string;
  unit: string;
  category: string;
  brand: string;
  stock: number | null;
  saleId: number;
  invoiceNo: string;
  date: string;
  customerId: number;
  customerName: string;
  contactId: string;
  qty: number;
  unitPrice: number;
  /** "10.00 %" or "$1.50". */
  discountText: string;
  tax: number;
  priceIncTax: number;
  total: number;
  unitCost: number;
};

type Group = { key: string; label: string; sku?: string; unit?: string; stock?: number | null; qty: number; total: number; lines: number };

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "detailed", label: "Detailed", icon: "menu" },
  { key: "purchase", label: "Detailed (with purchase)", icon: "cart" },
  { key: "grouped", label: "Grouped", icon: "grid" },
  { key: "category", label: "By category", icon: "tag" },
  { key: "brand", label: "By brand", icon: "cube" },
];
type Tab = "detailed" | "purchase" | "grouped" | "category" | "brand";

export function ProductSellReport() {
  const hydrated = useHydrated();
  const sales = useSales();
  const customers = useCustomers();
  const [products] = useDemoProducts();
  const categories = useCategories();
  const brands = useBrands();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<Tab>("detailed");

  const lines = useMemo(() => {
    const f = filters;
    const term = f.search.trim().toLowerCase();
    const productById = new Map(products.map((p) => [p.id, p]));
    const customerById = new Map(customers.map((c) => [c.id, c]));
    return sales
      .filter(
        (s) =>
          s.status === "Final" &&
          (!f.location || s.location === f.location) &&
          (!f.customer || s.customerId === Number(f.customer)) &&
          (!f.group || customerById.get(s.customerId)?.group === f.group) &&
          (!f.from || s.date.slice(0, 10) >= f.from) &&
          (!f.to || s.date.slice(0, 10) <= f.to) &&
          (!f.timeFrom || s.date.slice(11, 16) >= f.timeFrom) &&
          (!f.timeTo || s.date.slice(11, 16) <= f.timeTo),
      )
      .flatMap((s) =>
        s.lines.map((l, i): Line | null => {
          const p = productById.get(l.productId);
          if (f.category && p?.category !== f.category) return null;
          if (f.brand && p?.brand !== f.brand) return null;
          if (term && !`${l.name} ${l.sku}`.toLowerCase().includes(term)) return null;
          const variation = p?.variations.find((v) => v.sku === l.sku);
          const customer = customerById.get(s.customerId);
          return {
            key: `${s.id}-${i}`,
            productId: l.productId,
            product: l.name,
            sku: l.sku,
            unit: p?.unit ?? "Pcs",
            category: p?.category ?? "",
            brand: p?.brand ?? "",
            stock: p?.manageStock === false ? null : (variation?.stock ?? p?.stock ?? null),
            saleId: s.id,
            invoiceNo: s.invoiceNo,
            date: s.date,
            customerId: s.customerId,
            customerName: customer?.name ?? "Unknown customer",
            contactId: customer?.contactId ?? "",
            qty: l.qty,
            unitPrice: l.unitPrice,
            discountText: l.discount ? (l.discountType === "Percentage" ? `${l.discount.toFixed(2)} %` : money(l.discount)) : "0.00",
            tax: 0,
            priceIncTax: netUnitPrice(l),
            total: lineSubtotal(l),
            unitCost: variation?.purchasePrice ?? p?.purchasePrice ?? 0,
          };
        }),
      )
      .filter((l): l is Line => l !== null);
  }, [filters, sales, customers, products]);

  const groupBy = (keyOf: (l: Line) => string, labelOf: (l: Line) => string, extra?: (l: Line) => Partial<Group>) => {
    const map = new Map<string, Group>();
    for (const l of lines) {
      const key = keyOf(l);
      const g = map.get(key) ?? { key, label: labelOf(l), qty: 0, total: 0, lines: 0, ...extra?.(l) };
      g.qty += l.qty;
      g.total += l.total;
      g.lines += 1;
      map.set(key, g);
    }
    return [...map.values()];
  };

  const active = Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]).length;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const parents = categories.filter((c) => c.parentId === null);
  const unitsTotal = (list: { qty: number }[]) => <span className="tabular-nums">{qty(list.reduce((t, l) => t + l.qty, 0))}</span>;
  const moneyTotal = (list: { total: number }[]) => <span className="tabular-nums">{money(list.reduce((t, l) => t + l.total, 0))}</span>;

  const productCell = (l: { product: string; productId: number }) => (
    <Link href={`/products/${l.productId}/stock-history`} className="font-medium hover:text-brand-500 hover:underline">
      {l.product}
    </Link>
  );
  const base: DataColumn<Line>[] = [
    { key: "product", label: "Product", sortValue: (l) => l.product, text: (l) => l.product, render: productCell },
    { key: "sku", label: "SKU", sortValue: (l) => l.sku, text: (l) => l.sku, render: (l) => <span className="font-mono text-xs">{l.sku}</span> },
    { key: "customer", label: "Customer name", sortValue: (l) => l.customerName, text: (l) => l.customerName },
    { key: "contact", label: "Contact ID", sortValue: (l) => l.contactId, text: (l) => l.contactId, render: (l) => <span className="font-mono text-xs">{l.contactId}</span> },
    {
      key: "invoice",
      label: "Invoice no",
      sortValue: (l) => l.invoiceNo,
      text: (l) => l.invoiceNo,
      render: (l) => (
        <Link href={`/sales?view=${l.saleId}`} className="font-mono text-[12.5px] text-brand-500 hover:underline">
          {l.invoiceNo}
        </Link>
      ),
    },
    { key: "date", label: "Date", sortValue: (l) => l.date, text: (l) => when(l.date), render: (l) => <span className="whitespace-nowrap">{when(l.date)}</span> },
    {
      key: "qty",
      label: "Quantity",
      sortValue: (l) => l.qty,
      text: (l) => qty(l.qty),
      render: (l) => (
        <span className="tabular-nums">
          {qty(l.qty)} <span className="text-xs text-muted">{l.unit}</span>
        </span>
      ),
      align: "right",
      total: unitsTotal,
    },
  ];
  const detailed: DataColumn<Line>[] = [
    ...base,
    { key: "price", label: "Unit price", sortValue: (l) => l.unitPrice, text: (l) => l.unitPrice.toFixed(2), render: (l) => <span className="tabular-nums">{money(l.unitPrice)}</span>, align: "right" },
    {
      key: "discount",
      label: "Discount",
      sortValue: (l) => l.unitPrice - l.priceIncTax,
      text: (l) => l.discountText,
      render: (l) => <span className={cn("tabular-nums", l.discountText !== "0.00" ? "text-rose-600" : "text-muted")}>{l.discountText}</span>,
      align: "right",
    },
    { key: "tax", label: "Tax", sortValue: (l) => l.tax, text: (l) => l.tax.toFixed(2), render: (l) => <span className="tabular-nums text-muted">{money(l.tax)}</span>, align: "right" },
    { key: "inc", label: "Price inc. tax", sortValue: (l) => l.priceIncTax, text: (l) => l.priceIncTax.toFixed(2), render: (l) => <span className="tabular-nums">{money(l.priceIncTax)}</span>, align: "right" },
    { key: "total", label: "Total", sortValue: (l) => l.total, text: (l) => l.total.toFixed(2), render: (l) => <span className="font-medium tabular-nums">{money(l.total)}</span>, align: "right", total: moneyTotal },
  ];
  const withPurchase: DataColumn<Line>[] = [
    ...base.filter((c) => c.key !== "contact"),
    { key: "cost", label: "Unit purchase price", sortValue: (l) => l.unitCost, text: (l) => l.unitCost.toFixed(2), render: (l) => <span className="tabular-nums">{money(l.unitCost)}</span>, align: "right" },
    {
      key: "costTotal",
      label: "Total purchase price",
      sortValue: (l) => l.unitCost * l.qty,
      text: (l) => (l.unitCost * l.qty).toFixed(2),
      render: (l) => <span className="tabular-nums">{money(l.unitCost * l.qty)}</span>,
      align: "right",
      total: (list) => <span className="tabular-nums">{money(list.reduce((t, l) => t + l.unitCost * l.qty, 0))}</span>,
    },
    { key: "total", label: "Total sold", sortValue: (l) => l.total, text: (l) => l.total.toFixed(2), render: (l) => <span className="tabular-nums">{money(l.total)}</span>, align: "right", total: moneyTotal },
    {
      key: "profit",
      label: "Profit",
      sortValue: (l) => l.total - l.unitCost * l.qty,
      text: (l) => (l.total - l.unitCost * l.qty).toFixed(2),
      render: (l) => {
        const profit = l.total - l.unitCost * l.qty;
        return <span className={cn("font-medium tabular-nums", profit < 0 ? "text-rose-600" : "text-emerald-600")}>{money(profit)}</span>;
      },
      align: "right",
      total: (list) => <span className="tabular-nums">{money(list.reduce((t, l) => t + l.total - l.unitCost * l.qty, 0))}</span>,
    },
  ];
  const groupCols = (label: string, withProduct: boolean): DataColumn<Group>[] => [
    {
      key: "label",
      label,
      sortValue: (g) => g.label,
      text: (g) => g.label,
      render: (g) => <span className="font-medium">{g.label || <span className="font-normal text-muted">None</span>}</span>,
    },
    ...(withProduct
      ? ([
          { key: "sku", label: "SKU", sortValue: (g) => g.sku ?? "", text: (g) => g.sku ?? "", render: (g) => <span className="font-mono text-xs">{g.sku}</span> },
          {
            key: "stock",
            label: "Current stock",
            sortValue: (g) => g.stock ?? -1,
            text: (g) => (g.stock === null || g.stock === undefined ? "" : qty(g.stock)),
            render: (g) =>
              g.stock === null || g.stock === undefined ? (
                <span className="text-muted">Not managed</span>
              ) : (
                <span className="tabular-nums">
                  {qty(g.stock)} <span className="text-xs text-muted">{g.unit}</span>
                </span>
              ),
            align: "right",
          },
        ] satisfies DataColumn<Group>[])
      : [{ key: "lines", label: "Lines sold", sortValue: (g) => g.lines, text: (g) => String(g.lines), render: (g) => <span className="tabular-nums text-muted">{g.lines}</span>, align: "right" } satisfies DataColumn<Group>]),
    { key: "qty", label: "Total unit sold", sortValue: (g) => g.qty, text: (g) => qty(g.qty), render: (g) => <span className="tabular-nums">{qty(g.qty)}</span>, align: "right", total: unitsTotal },
    { key: "total", label: "Total", sortValue: (g) => g.total, text: (g) => g.total.toFixed(2), render: (g) => <span className="font-medium tabular-nums">{money(g.total)}</span>, align: "right", total: moneyTotal },
  ];

  const tabTitle = TABS.find((t) => t.key === tab)?.label ?? "";
  const subtitle = `${lines.length} line${lines.length === 1 ? "" : "s"} sold${active > 0 ? " matching the filters" : ""}`;

  return (
    <div className="flex flex-col gap-5">
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
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        className="print:hidden"
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Search product</span>
            <span className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                aria-label="Search product"
                value={filters.search}
                onChange={(event) => set("search", event.target.value)}
                placeholder="Product name / SKU / scan bar code"
                className={cn(filterClass, "pl-9 pr-3", filters.search ? "border-brand-500/60" : "border-line")}
              />
            </span>
          </label>
          <FilterSelect
            label="Customer"
            icon="contact"
            value={filters.customer}
            onChange={(v) => set("customer", v)}
            options={[{ value: "", label: "All" }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
          <FilterSelect
            label="Customer group"
            icon="users"
            value={filters.group}
            onChange={(v) => set("group", v)}
            options={[{ value: "", label: "All" }, ...CUSTOMER_GROUPS.map((g) => ({ value: g, label: g }))]}
          />
          <FilterSelect
            label="Business location"
            icon="store"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Category"
            icon="tag"
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={[{ value: "", label: "All" }, ...parents.map((c) => ({ value: c.name, label: c.name }))]}
          />
          <FilterSelect
            label="Brand"
            icon="cube"
            value={filters.brand}
            onChange={(v) => set("brand", v)}
            options={[{ value: "", label: "All" }, ...brands.map((b) => ({ value: b.name, label: b.name }))]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={filters.from}
                onChange={(event) => set("from", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.from !== DEFAULT_FILTERS.from ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={filters.to}
                onChange={(event) => set("to", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.to !== DEFAULT_FILTERS.to ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Time range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                aria-label="From time"
                value={filters.timeFrom}
                onChange={(event) => set("timeFrom", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.timeFrom !== DEFAULT_FILTERS.timeFrom ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="time"
                aria-label="To time"
                value={filters.timeTo}
                onChange={(event) => set("timeTo", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.timeTo !== DEFAULT_FILTERS.timeTo ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col">
        <div role="tablist" className="scrollbar-none flex overflow-x-auto rounded-t-xl border border-b-0 border-line bg-background px-2 print:hidden">
          {TABS.map((t) => (
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

        <div role="tabpanel" className="[&>*]:rounded-t-none">
          {!hydrated ? (
            <p className="rounded-b-xl border border-line bg-background py-10 text-center text-[13px] text-muted">Loading…</p>
          ) : tab === "detailed" ? (
            <DataTable key="detailed" title={tabTitle} subtitle={subtitle} rows={lines} columns={detailed} rowKey={(l) => l.key} defaultSort={{ key: "date", direction: "desc" }} defaultPageSize={100} noun="lines" exportName="product-sell-report" minWidth={1300} />
          ) : tab === "purchase" ? (
            <DataTable key="purchase" title={tabTitle} subtitle={`${subtitle} · cost from each product's purchase price`} rows={lines} columns={withPurchase} rowKey={(l) => l.key} defaultSort={{ key: "date", direction: "desc" }} defaultPageSize={100} noun="lines" exportName="product-sell-report-with-purchase" minWidth={1300} />
          ) : tab === "grouped" ? (
            <DataTable
              key="grouped"
              title={tabTitle}
              subtitle="Each product and variation once"
              rows={groupBy((l) => l.sku, (l) => l.product, (l) => ({ sku: l.sku, unit: l.unit, stock: l.stock }))}
              columns={groupCols("Product", true)}
              rowKey={(g) => g.key}
              defaultSort={{ key: "qty", direction: "desc" }}
              defaultPageSize={100}
              noun="products"
              exportName="product-sell-report-grouped"
              minWidth={760}
            />
          ) : tab === "category" ? (
            <DataTable
              key="category"
              title={tabTitle}
              subtitle="Units sold per product category"
              rows={groupBy((l) => l.category, (l) => l.category)}
              columns={groupCols("Category", false)}
              rowKey={(g) => g.key}
              defaultSort={{ key: "total", direction: "desc" }}
              defaultPageSize={100}
              noun="categories"
              exportName="product-sell-report-by-category"
              minWidth={600}
            />
          ) : (
            <DataTable
              key="brand"
              title={tabTitle}
              subtitle="Units sold per brand"
              rows={groupBy((l) => l.brand, (l) => l.brand)}
              columns={groupCols("Brand", false)}
              rowKey={(g) => g.key}
              defaultSort={{ key: "total", direction: "desc" }}
              defaultPageSize={100}
              noun="brands"
              exportName="product-sell-report-by-brand"
              minWidth={600}
            />
          )}
        </div>
      </div>
    </div>
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
