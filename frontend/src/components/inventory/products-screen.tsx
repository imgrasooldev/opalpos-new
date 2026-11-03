"use client";

/**
 * Inventory -> List Products, laid out like the old Opal POS screen: a Filters
 * card, then three tabs — All Products, Inactive Products, Stock Report.
 *
 * The product tabs have row checkboxes with bulk actions (delete, add to /
 * remove from location via a popup, deactivate or reactivate). The stock report shows
 * stock value and potential profit per product or variation, with totals;
 * rows with no stock left are highlighted. All changes stay in this page's
 * state for now.
 */

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import {
  LOCATION_CODES,
  PRODUCT_LOCATIONS,
  PRODUCT_TYPES,
  TAXES,
  type DemoProduct,
} from "@/components/inventory/products-data";
import { AddStockDialog } from "@/components/inventory/add-stock-dialog";
import { useDemoProducts } from "@/components/inventory/product-store";
import { logStock } from "@/components/inventory/stock-history";
import { useBrands } from "@/components/inventory/brands";
import { useCategories } from "@/components/inventory/categories";
import { useUnits } from "@/components/inventory/units";
import { ViewProductDialog } from "@/components/inventory/view-product-dialog";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const qty = (n: number, unit: string) => `${n.toFixed(2)} ${unit}`;
const dash = <span className="text-muted">—</span>;

type Tab = "all" | "inactive" | "stock";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "all", label: "All products", icon: "cube" },
  { key: "inactive", label: "Inactive products", icon: "eye-off" },
  { key: "stock", label: "Stock report", icon: "chart" },
];

// ---------- product list columns (All / Inactive tabs) ----------

const PRODUCT_COLUMNS: DataColumn<DemoProduct>[] = [
  {
    key: "product",
    label: "Product",
    sortValue: (p) => p.name,
    text: (p) => p.name,
    render: (p) => (
      <div className="flex items-center gap-3">
        {/* image upload isn't built yet — placeholder thumbnail */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted">
          <Icon name="cube" className="h-5 w-5" />
        </span>
        <div>
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            {p.name}
            {p.notForSelling && <Badge tone="amber">Not for selling</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {p.type}
            {p.variations.length > 0 && ` · ${p.variations.map((v) => v.name).join(", ")}`}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "locations",
    label: "Business location",
    sortValue: (p) => p.locations.join(", "),
    text: (p) => p.locations.join(", "),
    render: (p) =>
      p.locations.length ? (
        <span className="flex flex-wrap gap-1">
          {p.locations.map((l) => (
            <span key={l} className="rounded-md border border-line px-1.5 py-0.5 text-xs">
              {l}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-xs text-muted">Not in any location</span>
      ),
  },
  {
    key: "purchasePrice",
    label: "Unit purchase price",
    sortValue: (p) => p.purchasePrice,
    text: (p) => p.purchasePrice.toFixed(2),
    render: (p) => USD.format(p.purchasePrice),
    align: "right",
  },
  {
    key: "sellingPrice",
    label: "Selling price",
    sortValue: (p) => p.sellingPrice,
    text: (p) => p.sellingPrice.toFixed(2),
    render: (p) => USD.format(p.sellingPrice),
    align: "right",
  },
  {
    key: "stock",
    label: "Current stock",
    sortValue: (p) => p.stock,
    text: (p) => qty(p.stock, p.unit),
    render: (p) => (
      <span className={cn(p.stock <= 0 && "font-medium text-rose-600")}>{qty(p.stock, p.unit)}</span>
    ),
    align: "right",
  },
  {
    key: "sku",
    label: "SKU",
    sortValue: (p) => p.sku,
    text: (p) => p.sku,
    render: (p) => <span className="font-mono text-xs">{p.sku}</span>,
  },
  // extra details, off by default (the old screen doesn't show them)
  { key: "type", label: "Product type", sortValue: (p) => p.type, text: (p) => p.type, defaultHidden: true },
  {
    key: "category",
    label: "Category",
    sortValue: (p) => p.category ?? "",
    text: (p) => p.category ?? "",
    render: (p) => p.category ?? dash,
    defaultHidden: true,
  },
  {
    key: "brand",
    label: "Brand",
    sortValue: (p) => p.brand ?? "",
    text: (p) => p.brand ?? "",
    render: (p) => p.brand ?? dash,
    defaultHidden: true,
  },
  {
    key: "tax",
    label: "Tax",
    sortValue: (p) => p.tax ?? "",
    text: (p) => p.tax ?? "",
    render: (p) => p.tax ?? dash,
    defaultHidden: true,
  },
];

// ---------- stock report ----------

type StockRow = {
  key: string;
  sku: string;
  product: string;
  variation: string | null;
  category: string | null;
  location: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  sold: number;
  transferred: number;
  adjusted: number;
};

/** One row per product, or per variation for variable products. */
function stockRows(products: DemoProduct[]): StockRow[] {
  return products.flatMap((p): StockRow[] => {
    const base = {
      product: p.name,
      category: p.category,
      location: p.locations.join(", "),
      unit: p.unit,
      sellingPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
    };
    if (p.variations.length === 0)
      return [
        {
          ...base,
          key: p.sku,
          sku: p.sku,
          variation: null,
          stock: p.stock,
          sold: p.sold,
          transferred: p.transferred,
          adjusted: p.adjusted,
        },
      ];
    return p.variations.map((v) => ({
      ...base,
      key: v.sku,
      sku: v.sku,
      variation: `${p.name} - ${v.name}`,
      // a variation's own prices win over the product's
      sellingPrice: v.sellingPrice ?? p.sellingPrice,
      purchasePrice: v.purchasePrice ?? p.purchasePrice,
      stock: v.stock,
      sold: v.sold,
      transferred: 0,
      adjusted: 0,
    }));
  });
}

// stock can go negative (sold before it was received); it has no value then
const onHand = (r: StockRow) => Math.max(0, r.stock);
const byPurchase = (r: StockRow) => onHand(r) * r.purchasePrice;
const bySale = (r: StockRow) => onHand(r) * r.sellingPrice;
const total = (rows: StockRow[], pick: (r: StockRow) => number) => rows.reduce((t, r) => t + pick(r), 0);

const STOCK_COLUMNS: DataColumn<StockRow>[] = [
  { key: "sku", label: "SKU", sortValue: (r) => r.sku, text: (r) => r.sku, render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
  { key: "product", label: "Product", sortValue: (r) => r.product, text: (r) => r.product },
  {
    key: "variation",
    label: "Variation",
    sortValue: (r) => r.variation ?? "",
    text: (r) => r.variation ?? "",
    render: (r) => r.variation ?? dash,
  },
  {
    key: "category",
    label: "Category",
    sortValue: (r) => r.category ?? "",
    text: (r) => r.category ?? "",
    render: (r) => r.category ?? dash,
  },
  {
    key: "location",
    label: "Location",
    sortValue: (r) => r.location,
    text: (r) => r.location,
    render: (r) => r.location || dash,
  },
  {
    key: "sellingPrice",
    label: "Unit selling price",
    sortValue: (r) => r.sellingPrice,
    text: (r) => r.sellingPrice.toFixed(2),
    render: (r) => USD.format(r.sellingPrice),
    align: "right",
  },
  {
    key: "stock",
    label: "Current stock",
    sortValue: (r) => r.stock,
    text: (r) => qty(r.stock, r.unit),
    render: (r) => (
      <span className={cn(r.stock <= 0 && "font-medium text-rose-600")}>{qty(r.stock, r.unit)}</span>
    ),
    align: "right",
    total: (rows) => total(rows, onHand).toFixed(2),
  },
  {
    key: "valuePurchase",
    label: "Stock value (purchase)",
    sortValue: byPurchase,
    text: (r) => byPurchase(r).toFixed(2),
    render: (r) => USD.format(byPurchase(r)),
    align: "right",
    total: (rows) => USD.format(total(rows, byPurchase)),
  },
  {
    key: "valueSale",
    label: "Stock value (sale)",
    sortValue: bySale,
    text: (r) => bySale(r).toFixed(2),
    render: (r) => USD.format(bySale(r)),
    align: "right",
    total: (rows) => USD.format(total(rows, bySale)),
  },
  {
    key: "profit",
    label: "Potential profit",
    sortValue: (r) => bySale(r) - byPurchase(r),
    text: (r) => (bySale(r) - byPurchase(r)).toFixed(2),
    render: (r) => (
      <span className="text-emerald-700 dark:text-emerald-300">
        {USD.format(bySale(r) - byPurchase(r))}
      </span>
    ),
    align: "right",
    total: (rows) => USD.format(total(rows, (r) => bySale(r) - byPurchase(r))),
  },
  {
    key: "sold",
    label: "Total unit sold",
    sortValue: (r) => r.sold,
    text: (r) => qty(r.sold, r.unit),
    align: "right",
    total: (rows) => total(rows, (r) => r.sold).toFixed(2),
  },
  {
    key: "transferred",
    label: "Total unit transferred",
    sortValue: (r) => r.transferred,
    text: (r) => qty(r.transferred, r.unit),
    align: "right",
    total: (rows) => total(rows, (r) => r.transferred).toFixed(2),
  },
  {
    key: "adjusted",
    label: "Total unit adjusted",
    sortValue: (r) => r.adjusted,
    text: (r) => qty(r.adjusted, r.unit),
    align: "right",
    total: (rows) => total(rows, (r) => r.adjusted).toFixed(2),
  },
];

// ---------- filters ----------

type Filters = {
  type: string;
  category: string;
  unit: string;
  tax: string;
  brand: string;
  location: string;
  notForSelling: boolean;
};

const NO_FILTERS: Filters = {
  type: "",
  category: "",
  unit: "",
  tax: "",
  brand: "",
  location: "",
  notForSelling: false,
};

function matches(p: DemoProduct, f: Filters) {
  return (
    (!f.type || p.type === f.type) &&
    (!f.category || p.category === f.category) &&
    (!f.unit || p.unit === f.unit) &&
    (!f.tax || (f.tax === "none" ? !p.tax : p.tax === f.tax)) &&
    (!f.brand || p.brand === f.brand) &&
    (!f.location || p.locations.includes(f.location)) &&
    (!f.notForSelling || p.notForSelling)
  );
}

// ---------- screen ----------

export function ProductsScreen() {
  // shared with the add product and opening stock screens
  const [products, setProducts] = useDemoProducts();
  const units = useUnits();
  const categories = useCategories();
  const brands = useBrands();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [locationDialog, setLocationDialog] = useState<"add" | "remove" | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [addingStock, setAddingStock] = useState<DemoProduct | null>(null);
  const [viewing, setViewing] = useState<DemoProduct | null>(null);

  const filtered = useMemo(() => products.filter((p) => matches(p, filters)), [products, filters]);
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value !== NO_FILTERS[key as keyof Filters],
  ).length;

  const lists = {
    all: filtered.filter((p) => p.active),
    inactive: filtered.filter((p) => !p.active),
  };

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  /** Applies a change to the selected products, then clears the selection. */
  function updateSelected(change: (p: DemoProduct) => DemoProduct) {
    setProducts((prev) => prev.map((p) => (selected.has(p.id) ? change(p) : p)));
    setSelected(new Set());
  }

  const plural = (n: number) => `${n} product${n === 1 ? "" : "s"}`;

  // every bulk or destructive action asks first, like the old screen
  function deleteProducts(ids: Set<string | number>, name?: string) {
    setConfirm({
      tone: "danger",
      confirmLabel: "Delete",
      message: `${name ?? plural(ids.size)} will be deleted. This can't be undone.`,
      onConfirm: () => {
        setProducts((prev) => prev.filter((p) => !ids.has(p.id)));
        setSelected(new Set());
      },
    });
  }

  function setActive(ids: Set<string | number>, active: boolean, name?: string) {
    const who = name ?? plural(ids.size);
    setConfirm({
      // bringing products back is the "good" direction — green, not amber
      tone: active ? "success" : "warning",
      confirmLabel: active ? "Reactivate" : "Deactivate",
      message: active
        ? `${who} will be available on sales screens again.`
        : `${who} will move to Inactive products and be hidden from sales screens.`,
      onConfirm: () => {
        setProducts((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, active } : p)));
        setSelected(new Set());
      },
    });
  }

  const none = selected.size === 0;
  const bulkActions = (
    <>
      <BulkButton tone="rose" icon="trash" disabled={none} onClick={() => deleteProducts(selected)}>
        Delete selected
      </BulkButton>
      <BulkButton tone="green" icon="store" disabled={none} onClick={() => setLocationDialog("add")}>
        Add to location
      </BulkButton>
      <BulkButton tone="slate" icon="store" disabled={none} onClick={() => setLocationDialog("remove")}>
        Remove from location
      </BulkButton>
      {tab === "all" ? (
        <BulkButton
          tone="amber"
          icon="eye-off"
          disabled={none}
          onClick={() => setActive(selected, false)}
        >
          Deactivate selected
        </BulkButton>
      ) : (
        <BulkButton
          tone="green"
          icon="eye"
          disabled={none}
          onClick={() => setActive(selected, true)}
        >
          Reactivate selected
        </BulkButton>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">
                {activeFilters}
              </span>
            )}
          </h2>
        }
        action={
          activeFilters > 0 && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="Product type" value={filters.type} onChange={(v) => set("type", v)} options={PRODUCT_TYPES} />
          <FilterSelect
            label="Category"
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={categories.filter((c) => c.parentId === null).map((c) => c.name)}
          />
          <FilterSelect
            label="Unit"
            value={filters.unit}
            onChange={(v) => set("unit", v)}
            options={units.map((u) => u.shortName)}
          />
          <FilterSelect
            label="Tax"
            value={filters.tax}
            onChange={(v) => set("tax", v)}
            options={TAXES}
            extra={<option value="none">No tax</option>}
          />
          <FilterSelect
            label="Brand"
            value={filters.brand}
            onChange={(v) => set("brand", v)}
            options={brands.map((b) => b.name)}
          />
          <FilterSelect
            label="Business location"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={PRODUCT_LOCATIONS}
          />
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 self-end rounded-full border px-3 py-2 text-[12.5px] transition-colors sm:w-fit",
              filters.notForSelling
                ? "border-brand-500 bg-brand-50 font-medium text-brand-600 dark:bg-brand-900 dark:text-brand-200"
                : "border-line text-muted hover:text-foreground",
            )}
          >
            <input
              type="checkbox"
              checked={filters.notForSelling}
              onChange={(event) => set("notForSelling", event.target.checked)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            Not for selling
          </label>
        </div>
      </Card>

      <section className="rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
        <div role="tablist" className="scrollbar-none flex overflow-x-auto border-b border-line px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key);
                setSelected(new Set());
              }}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[13px] transition-colors",
                tab === t.key ? "font-medium text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
              {t.key !== "stock" && (
                <span className="rounded bg-surface px-1.5 text-[10.5px] tabular-nums text-muted">
                  {lists[t.key].length}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="p-5">
          {tab === "stock" ? (
            <DataTable
              key="stock"
              title="Stock report"
              subtitle="Stock value and potential profit for active products"
              rows={stockRows(lists.all)}
              columns={STOCK_COLUMNS}
              rowKey={(r) => r.key}
              defaultSort={{ key: "sku", direction: "asc" }}
              defaultPageSize={100}
              noun="stock"
              exportName="stock-report"
              minWidth={1700}
              // out of stock (or oversold) rows stand out, as in the old report
              rowClassName={(r) => (r.stock <= 0 ? "bg-rose-50/70 dark:bg-rose-950/30" : undefined)}
            />
          ) : (
            <DataTable
              key={tab}
              title={tab === "all" ? "All products" : "Inactive products"}
              subtitle={
                tab === "all"
                  ? `${lists.all.length} products you can sell`
                  : "Hidden from sales screens until reactivated"
              }
              rows={lists[tab]}
              columns={PRODUCT_COLUMNS}
              rowKey={(p) => p.id}
              defaultSort={{ key: "product", direction: "asc" }}
              defaultPageSize={100}
              noun="products"
              exportName={tab === "all" ? "products" : "inactive-products"}
              minWidth={1100}
              actionsPosition="start"
              selection={{ selected, onChange: setSelected }}
              bulkActions={bulkActions}
              headerAction={
                tab === "all" && (
                  <div className="flex gap-2">
                    {/* the import screen isn't built yet */}
                    <Button type="button" variant="secondary">
                      <Icon name="download" className="h-4 w-4" />
                      Download Excel
                    </Button>
                    <Link href="/products/create" className={buttonStyles({ variant: "brand" })}>
                      <Icon name="plus" className="h-4 w-4" />
                      Add product
                    </Link>
                  </div>
                )
              }
              actions={(p) => (
                <>
                  <ActionsMenu
                    label={`Actions for ${p.name}`}
                    // same items and order as the old Opal POS product menu;
                    // Duplicate needs its screen first
                    actions={[
                      { label: "Labels", icon: "tag", href: `/labels?product_id=${p.id}` },
                      { label: "View", icon: "eye", onClick: () => setViewing(p) },
                      { label: "Edit", icon: "pencil", href: `/products/${p.id}/edit` },
                      {
                        label: "Delete",
                        icon: "trash",
                        danger: true,
                        onClick: () => deleteProducts(new Set([p.id]), p.name),
                      },
                      {
                        label: p.active ? "Deactivate" : "Activate",
                        icon: p.active ? "eye-off" : "eye",
                        onClick: () => setActive(new Set([p.id]), !p.active, p.name),
                      },
                      { label: "Add stock", icon: "plus", dividerBefore: true, onClick: () => setAddingStock(p) },
                      { label: "Edit opening stock", icon: "cube", href: `/products/${p.id}/opening-stock` },
                      { label: "Product stock history", icon: "refund", href: `/products/${p.id}/stock-history` },
                      { label: "Duplicate product", icon: "columns" },
                    ]}
                  />
                  <RowAction
                    icon="pencil"
                    label={`Edit ${p.name}`}
                    tone="brand"
                    href={`/products/${p.id}/edit`}
                  />
                  <RowAction
                    icon="plus"
                    label={`Add stock for ${p.name}`}
                    tone="aqua"
                    onClick={() => setAddingStock(p)}
                  />
                </>
              )}
            />
          )}
        </div>
      </section>

      {viewing && <ViewProductDialog product={viewing} onClose={() => setViewing(null)} />}

      {addingStock && (
        <AddStockDialog
          product={addingStock}
          onClose={() => setAddingStock(null)}
          onSave={(added) => {
            // adds to what's there (the opening stock page sets it instead)
            const byRow = (i: number) => added.filter((a) => a.index === i).reduce((t, a) => t + a.qty, 0);
            setProducts((prev) =>
              prev.map((p) => {
                if (p.id !== addingStock.id) return p;
                const skuOf = (i: number) => (p.variations.length ? p.variations[i].sku : p.sku);
                const next = p.variations.length
                  ? {
                      ...p,
                      variations: p.variations.map((v, i) => ({ ...v, stock: v.stock + byRow(i) })),
                      stock: p.stock + added.reduce((t, a) => t + a.qty, 0),
                    }
                  : { ...p, stock: p.stock + byRow(0) };
                return logStock(
                  next,
                  added.map((a) => ({ sku: skuOf(a.index), qty: a.qty, location: a.location })),
                );
              }),
            );
            setAddingStock(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}

      {locationDialog && (
        <LocationDialog
          mode={locationDialog}
          count={selected.size}
          onClose={() => setLocationDialog(null)}
          onSave={(location) => {
            updateSelected((p) =>
              locationDialog === "add"
                ? p.locations.includes(location)
                  ? p
                  : { ...p, locations: [...p.locations, location] }
                : { ...p, locations: p.locations.filter((l) => l !== location) },
            );
            setLocationDialog(null);
          }}
        />
      )}
    </div>
  );
}

/** "Add location to / Remove location from the selected products" popup, as in the old screen. */
function LocationDialog({
  mode,
  count,
  onClose,
  onSave,
}: {
  mode: "add" | "remove";
  count: number;
  onClose: () => void;
  onSave: (location: string) => void;
}) {
  const [location, setLocation] = useState("");
  const [error, setError] = useState(false);

  return (
    <Modal
      title={
        mode === "add"
          ? "Add location to the selected products"
          : "Remove location from the selected products"
      }
      description={`${count} product${count === 1 ? "" : "s"} selected`}
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => (location ? onSave(location) : setError(true))}
          >
            Save
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Business location *</span>
        <span className="relative">
          <Icon
            name="store"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <select
            autoFocus
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              setError(false);
            }}
            className={cn(
              "w-full appearance-none rounded-lg border bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 dark:bg-navy-900",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                : "border-zinc-300 focus:border-brand-500 focus:ring-brand-500/25 dark:border-navy-700",
            )}
          >
            <option value="">None</option>
            {PRODUCT_LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l} ({LOCATION_CODES[l]})
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
        </span>
        {error ? (
          <span className="text-xs text-red-600">Pick a location</span>
        ) : (
          <span className="text-xs text-muted">
            {mode === "add"
              ? "The products become available to sell at this location."
              : "The products can no longer be sold at this location."}
          </span>
        )}
      </label>
    </Modal>
  );
}

const BULK_TONES = {
  rose: "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950",
  amber: "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950",
  green: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950",
  slate: "border-line text-foreground hover:bg-surface",
};

function BulkButton({
  tone,
  icon,
  disabled,
  onClick,
  children,
}: {
  tone: keyof typeof BULK_TONES;
  icon: IconName;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border bg-background px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        BULK_TONES[tone],
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  extra,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  extra?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-9 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
            value ? "border-brand-500/60" : "border-line",
          )}
        >
          <option value="">All</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
          {extra}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}
