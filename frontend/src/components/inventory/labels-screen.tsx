"use client";

/**
 * Print Labels, as in the old Opal POS: pick products (or open it from a
 * product's Actions -> Labels to start with that product), choose how many
 * labels each, what to show on them and the sheet layout, then Preview and
 * Print.
 *
 * The barcode in the preview is drawn from the SKU for layout only — it is
 * NOT a scannable Code 128. Real barcodes need a barcode library (or the
 * backend) before labels are printed for use.
 */

import { useMemo, useState } from "react";

import { DEMO_BUSINESS } from "@/components/contacts/customers-data";
import { usePriceGroups } from "@/components/inventory/price-groups";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** One label row: a single product, or one variation of a variable product. */
type LabelRow = {
  key: string;
  product: string;
  variation: string | null;
  sku: string;
  price: number;
  /** This SKU's price per selling price group id. */
  groupPrices: Record<number, number>;
  count: string;
  packingDate: string;
  priceGroup: string;
};

type Field = { on: boolean; size: string };

/**
 * The old system's barcode settings. Label sizes are in inches; the preview
 * draws them at 96 px per inch, `columns` across like on the sheet.
 */
const SHEETS = [
  { id: "brother-1x1", label: "Galaxy Brother, 1 × 1", columns: 1, w: 2.25, h: 1.25 },
  {
    id: "sheet-20",
    label: 'Sheet 8.5" × 11", label 4" × 1", 20 per sheet',
    columns: 2,
    w: 4,
    h: 1,
  },
  {
    id: "sheet-30",
    label: 'Sheet 8.5" × 11", label 2.625" × 1", 30 per sheet',
    columns: 3,
    w: 2.625,
    h: 1,
  },
  {
    id: "sheet-32",
    label: 'Sheet 8.5" × 11", label 2" × 1.25", 32 per sheet',
    columns: 4,
    w: 2,
    h: 1.25,
  },
  {
    id: "sheet-40",
    label: 'Sheet 8.5" × 11", label 2" × 1", 40 per sheet',
    columns: 4,
    w: 2,
    h: 1,
  },
  {
    id: "sheet-50",
    label: 'Sheet 8.5" × 11", label 1.5" × 1", 50 per sheet',
    columns: 5,
    w: 1.5,
    h: 1,
  },
  {
    id: "roll",
    label: "Continuous rolls, label 31.75 mm × 25.4 mm, gap 3.18 mm",
    columns: 1,
    w: 1.25,
    h: 1,
  },
];
const PX_PER_INCH = 96;

const TAX_RATE = 0.0825;
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** All labelable rows of a product: one per variation, or the product itself. */
function rowsFor(p: DemoProduct): LabelRow[] {
  const base = { product: p.name, count: "1", packingDate: "", priceGroup: "" };
  const pricesFor = (sku: string) =>
    Object.fromEntries(
      Object.entries(p.groupPrices ?? {}).flatMap(([gid, bySku]) =>
        bySku[sku] != null ? [[Number(gid), bySku[sku]]] : [],
      ),
    );
  return p.variations.length
    ? p.variations.map((v) => ({
        ...base,
        key: `${p.id}:${v.sku}`,
        variation: v.name,
        sku: v.sku,
        price: v.sellingPrice ?? p.sellingPrice,
        groupPrices: pricesFor(v.sku),
      }))
    : [
        {
          ...base,
          key: `${p.id}`,
          variation: null,
          sku: p.sku,
          price: p.sellingPrice,
          groupPrices: pricesFor(p.sku),
        },
      ];
}

export function LabelsScreen({ productId }: { productId: number | null }) {
  const hydrated = useHydrated();
  const [products] = useDemoProducts();

  // products added in this tab only exist in the browser, so wait for them
  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  const start = products.find((p) => p.id === productId);
  return <LabelsForm products={products} initial={start ? rowsFor(start) : []} />;
}

function LabelsForm({ products, initial }: { products: DemoProduct[]; initial: LabelRow[] }) {
  const groups = usePriceGroups().filter((g) => g.active);
  const [rows, setRows] = useState<LabelRow[]>(initial);
  const [search, setSearch] = useState("");
  const [fields, setFields] = useState<Record<"name" | "variation" | "price" | "business" | "date", Field>>({
    name: { on: true, size: "15" },
    // off by default like the old screen, even though it's "recommended"
    variation: { on: false, size: "17" },
    price: { on: true, size: "10" },
    business: { on: false, size: "20" },
    date: { on: false, size: "12" },
  });
  const [priceTax, setPriceTax] = useState<"exc" | "inc">("exc");
  const [sheet, setSheet] = useState(SHEETS[0].id);
  const [preview, setPreview] = useState(false);

  // search matches, one entry per variation, minus rows already added
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const added = new Set(rows.map((r) => r.key));
    return products
      .filter((p) => p.active)
      .flatMap(rowsFor)
      .filter(
        (r) =>
          !added.has(r.key) &&
          `${r.product} ${r.variation ?? ""} ${r.sku}`.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [search, products, rows]);

  function update(key: string, patch: Partial<LabelRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setPreview(false);
  }
  function setField(key: keyof typeof fields, patch: Partial<Field>) {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setPreview(false);
  }

  const layout = SHEETS.find((s) => s.id === sheet)!;
  const totalLabels = rows.reduce((t, r) => t + Math.max(0, Math.floor(Number(r.count) || 0)), 0);

  return (
    <div className="flex flex-col gap-5 print:gap-0">
      <div className="flex flex-col gap-5 print:hidden">
        <Card
          title={
            <div>
              <h2 className="text-sm font-semibold">Add products to generate labels</h2>
              <p className="mt-0.5 text-xs text-muted">Search by product name or SKU.</p>
            </div>
          }
          bodyClassName="border-t border-line pt-4"
        >
          <div className="relative max-w-2xl">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter product name to print labels"
              aria-label="Search products"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
            />
            {search.trim() && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-background p-1 shadow-lg shadow-navy-950/10">
                {matches.length === 0 && (
                  <li className="px-3 py-2 text-[13px] text-muted">No products match.</li>
                )}
                {matches.map((m) => (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setRows((prev) => [...prev, m]);
                        setSearch("");
                        setPreview(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] hover:bg-surface"
                    >
                      <span>
                        {m.product}
                        {m.variation && <span className="font-medium"> {m.variation}</span>}
                      </span>
                      <span className="font-mono text-xs text-muted">{m.sku}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Products</th>
                  <th className="px-4 py-2.5 font-medium">No. of labels</th>
                  <th className="px-4 py-2.5 font-medium">Packing date</th>
                  <th className="px-4 py-2.5 font-medium">Selling price group</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      {r.product}
                      {r.variation && <span className="font-semibold"> {r.variation}</span>}
                      <span className="ml-1.5 font-mono text-xs text-muted">{r.sku}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        aria-label={`Number of labels for ${r.product} ${r.variation ?? ""}`}
                        value={r.count}
                        onChange={(event) => update(r.key, { count: event.target.value.replace(/\D/g, "") })}
                        inputMode="numeric"
                        className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="date"
                        aria-label={`Packing date for ${r.product}`}
                        value={r.packingDate}
                        onChange={(event) => update(r.key, { packingDate: event.target.value })}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {/* the label shows this group's price, or the default when it has none */}
                      <select
                        aria-label="Selling price group"
                        value={r.priceGroup}
                        onChange={(event) => update(r.key, { priceGroup: event.target.value })}
                        className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                      >
                        <option value="">None</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${r.product} ${r.variation ?? ""}`}
                        onClick={() => {
                          setRows((prev) => prev.filter((x) => x.key !== r.key));
                          setPreview(false);
                        }}
                        className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Search above to add products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title={
            <div>
              <h2 className="text-sm font-semibold">Information to show in labels</h2>
              <p className="mt-0.5 text-xs text-muted">Tick what to print and its font size (px).</p>
            </div>
          }
          bodyClassName="border-t border-line pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FieldToggle label="Product name" field={fields.name} onChange={(p) => setField("name", p)} />
            <FieldToggle
              label="Product variation (recommended)"
              field={fields.variation}
              onChange={(p) => setField("variation", p)}
            />
            <FieldToggle label="Product price" field={fields.price} onChange={(p) => setField("price", p)} />
            <label className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
              <span className="text-[13px] font-medium">Show price</span>
              <select
                value={priceTax}
                onChange={(event) => {
                  setPriceTax(event.target.value as "exc" | "inc");
                  setPreview(false);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
              >
                <option value="exc">Exc. tax</option>
                <option value="inc">Inc. tax</option>
              </select>
            </label>
            <FieldToggle label="Business name" field={fields.business} onChange={(p) => setField("business", p)} />
            <FieldToggle label="Print packing date" field={fields.date} onChange={(p) => setField("date", p)} />
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
            <label className="flex w-full max-w-md flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Barcode setting</span>
              <span className="relative">
                <Icon
                  name="gear"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                />
                <select
                  value={sheet}
                  onChange={(event) => {
                    setSheet(event.target.value);
                    setPreview(false);
                  }}
                  className="w-full max-w-md appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                >
                  {SHEETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
              </span>
            </label>

            <Button
              type="button"
              variant="brand"
              disabled={totalLabels === 0}
              onClick={() => setPreview(true)}
              className="min-w-48"
            >
              <Icon name="eye" className="h-4 w-4" />
              Preview {totalLabels > 0 && `(${totalLabels} label${totalLabels === 1 ? "" : "s"})`}
            </Button>
          </div>
        </Card>
      </div>

      {preview && (
        <Card
          className="print:border-0 print:shadow-none"
          title={
            <div className="print:hidden">
              <h2 className="text-sm font-semibold">Preview</h2>
              <p className="mt-0.5 text-xs text-muted">
                {totalLabels} labels · {layout.label}. The barcode here is a layout sample, not scannable yet.
              </p>
            </div>
          }
          action={
            <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden">
              <Icon name="printer" className="h-4 w-4" />
              Print
            </Button>
          }
          bodyClassName="border-t border-line pt-5 print:border-0 print:p-0"
        >
          <div
            className="grid justify-center gap-3"
            style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.w * PX_PER_INCH}px)` }}
          >
            {rows.flatMap((r) =>
              Array.from({ length: Math.max(0, Math.floor(Number(r.count) || 0)) }, (_, i) => (
                <LabelCard
                  key={`${r.key}-${i}`}
                  minHeight={layout.h * PX_PER_INCH}
                  row={r}
                  fields={fields}
                  price={(() => {
                    const base = r.priceGroup ? (r.groupPrices[Number(r.priceGroup)] ?? r.price) : r.price;
                    return priceTax === "inc" ? base * (1 + TAX_RATE) : base;
                  })()}
                />
              )),
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function FieldToggle({
  label,
  field,
  onChange,
}: {
  label: string;
  field: Field;
  onChange: (patch: Partial<Field>) => void;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-3 transition-colors", field.on ? "border-brand-500/40" : "border-line")}>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
        <input
          type="checkbox"
          checked={field.on}
          onChange={(event) => onChange({ on: event.target.checked })}
          className="h-4 w-4 accent-brand-500"
        />
        {label}
      </label>
      <span className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-navy-700">
        <span className="border-r border-zinc-300 bg-surface px-2.5 py-1.5 text-xs text-muted dark:border-navy-700">
          Size
        </span>
        <input
          aria-label={`${label} font size`}
          value={field.size}
          disabled={!field.on}
          onChange={(event) => onChange({ size: event.target.value.replace(/\D/g, "") })}
          inputMode="numeric"
          className="w-full min-w-0 bg-white px-3 py-1.5 text-sm tabular-nums outline-none disabled:bg-surface disabled:text-muted dark:bg-navy-900"
        />
      </span>
    </div>
  );
}

function LabelCard({
  row,
  fields,
  price,
  minHeight,
}: {
  minHeight: number;
  row: LabelRow;
  fields: Record<"name" | "variation" | "price" | "business" | "date", Field>;
  price: number;
}) {
  const px = (f: Field) => `${Math.min(40, Math.max(6, Number(f.size) || 10))}px`;

  return (
    <div
      style={{ minHeight }}
      className="flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-dashed border-zinc-300 bg-white px-2 py-1.5 text-center text-black break-inside-avoid"
    >
      {fields.business.on && (
        <p className="font-semibold leading-tight" style={{ fontSize: px(fields.business) }}>
          {DEMO_BUSINESS.name}
        </p>
      )}
      {fields.name.on && (
        <p className="font-medium leading-tight" style={{ fontSize: px(fields.name) }}>
          {row.product}
        </p>
      )}
      {fields.variation.on && row.variation && (
        <p className="leading-tight" style={{ fontSize: px(fields.variation) }}>
          {row.variation}
        </p>
      )}
      {fields.price.on && (
        <p className="font-bold leading-tight" style={{ fontSize: px(fields.price) }}>
          {USD.format(price)}
        </p>
      )}
      {fields.date.on && row.packingDate && (
        <p className="leading-tight" style={{ fontSize: px(fields.date) }}>
          Packed: {row.packingDate}
        </p>
      )}
      <SampleBarcode value={row.sku} />
      <p className="font-mono text-[10px] tracking-wider">{row.sku}</p>
    </div>
  );
}

/**
 * Bars drawn from the SKU's characters so each product's label looks
 * distinct. Layout only — not a real barcode symbology.
 */
function SampleBarcode({ value }: { value: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  const push = (w: number, dark: boolean) => {
    if (dark) bars.push({ x, w });
    x += w;
  };
  // guard bars, then each character's bits as thin/thick bars
  push(1, true); push(1, false); push(1, true); push(2, false);
  for (const ch of value) {
    const bits = ch.charCodeAt(0).toString(2).padStart(8, "0");
    for (let i = 0; i < bits.length; i++) push(bits[i] === "1" ? 2 : 1, i % 2 === 0);
    push(1, false);
  }
  push(1, true); push(1, false); push(1, true);

  return (
    <svg
      viewBox={`0 0 ${x} 30`}
      preserveAspectRatio="none"
      className="mt-1 h-9 w-full"
      role="img"
      aria-label={`Sample barcode for ${value}`}
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="#000" />
      ))}
    </svg>
  );
}
