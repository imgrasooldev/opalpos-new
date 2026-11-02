"use client";

/**
 * Add product — same fields and flow as the old Opal POS form:
 *
 *   1. details: name, SKU, barcode type, unit / brand / category (each with a
 *      "+" to add a new option), business locations, manage stock, age
 *      verification, alert quantity
 *   2. pricing: applicable tax, selling price tax type, product type —
 *      Single shows purchase price × margin = selling price (each side
 *      recalculates the other); Variable shows a variation values table
 *   3. rack / row / position per selected location
 *
 * "Save" opens the opening stock screen when stock is managed (like the old
 * flow), otherwise goes back to the list. "Save and add another" keeps you
 * here with a fresh form. Products go into the shared demo store.
 *
 * Edit uses the same form (pass `product`): fields start filled, SKU becomes
 * required and the product type is locked. Edit also has the old screen's
 * Stock and Prices group tabs; all three live in one form, so "Update" saves
 * details, prices and stock quantities together.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { nextIds, updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { usePriceGroups, type PriceGroup } from "@/components/inventory/price-groups";
import { logStock } from "@/components/inventory/stock-history";
import { updateUnits, useUnits } from "@/components/inventory/units";
import { UnitDialog } from "@/components/inventory/units-screen";
import { useTemplates } from "@/components/inventory/variation-templates";
import {
  BRANDS,
  CATEGORIES,
  LOCATION_CODES,
  PRODUCT_LOCATIONS,
  TAXES,
  type DemoProduct,
} from "@/components/inventory/products-data";
import {
  StockTables,
  formatUsd,
  initialStockLines,
  quantityOf,
  stockStamp,
  stockTotal,
  type StockRow,
} from "@/components/inventory/stock-lines";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const BARCODE_TYPES = ["Code 128 (C128)", "Code 39 (C39)", "EAN-13", "EAN-8", "UPC-A", "UPC-E"];
const FORM_ID = "product-form";

type ProductType = "Single" | "Variable";
type Variation = {
  key: number;
  value: string;
  sku: string;
  purchase: string;
  selling: string;
  age: boolean;
  /** Edit only: index of the saved variation this row came from, to keep its stock. */
  origin?: number;
};
type Errors = Partial<Record<"name" | "sku" | "unit" | "purchase" | "variations", string>>;

const num = (v: string) => Number(v) || 0;
/** "1,400.00" — thousands separators, like the old margin label. */
const PERCENT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fixed = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "");
/** Margin % between a purchase and a selling price; null if it can't be worked out. */
const margin = (purchase: string, selling: string) =>
  num(purchase) > 0 && selling !== "" ? ((num(selling) / num(purchase) - 1) * 100) : null;

let variationKey = 0;
const blankVariation = (): Variation => ({
  key: ++variationKey,
  value: "",
  sku: "",
  purchase: "",
  selling: "",
  age: false,
});

/** An option list that also contains a value added earlier with "+". */
const withValue = (list: string[], value: string | null | undefined) =>
  value && !list.includes(value) ? [...list, value] : list;

export type EditTab = "edit" | "stock" | "prices";

export function ProductForm({
  product,
  tab = "edit",
  onTabChange,
}: {
  product?: DemoProduct;
  /** Edit only: which of the Edit / Stock / Prices group tabs is showing. */
  tab?: EditTab;
  onTabChange?: (tab: EditTab) => void;
}) {
  const router = useRouter();
  // edit: "update and add another" just moves on to a new product
  if (product)
    return (
      <ProductFormFields
        product={product}
        tab={tab}
        onTabChange={onTabChange}
        onAddedAnother={() => router.push("/products/create")}
      />
    );
  return <AddProductForm />;
}

function AddProductForm() {
  // remounting the inner form (new key) is how "save and add another" starts fresh
  const [round, setRound] = useState(0);
  const [lastAdded, setLastAdded] = useState<string>();

  return (
    <div className="flex flex-col gap-5">
      {lastAdded && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <span>
            <span className="font-semibold">{lastAdded}</span> was added. Fill in the next product
            below.
          </span>
          <Link href="/products" className="font-medium underline-offset-2 hover:underline">
            View products
          </Link>
        </div>
      )}
      <ProductFormFields
        key={round}
        onAddedAnother={(name) => {
          setLastAdded(name);
          setRound((r) => r + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

function ProductFormFields({
  product,
  tab = "edit",
  onTabChange,
  onAddedAnother,
}: {
  product?: DemoProduct;
  tab?: EditTab;
  onTabChange?: (tab: EditTab) => void;
  onAddedAnother: (name: string) => void;
}) {
  const router = useRouter();
  const editing = Boolean(product);
  const [products] = useDemoProducts();
  const templates = useTemplates();
  const [errors, setErrors] = useState<Errors>({});

  // option lists can grow from the "+" buttons
  // units come from Inventory -> Units (by short name), plus a saved unit no longer listed
  const allUnits = useUnits();
  const units = withValue(allUnits.map((u) => u.shortName), product?.unit);
  const [brands, setBrands] = useState(() => withValue(BRANDS, product?.brand));
  const [categories, setCategories] = useState(() => withValue(CATEGORIES, product?.category));
  const [unit, setUnit] = useState(product?.unit ?? "Pcs");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [quickAdd, setQuickAdd] = useState<"unit" | "brand" | "category" | null>(null);

  const [locations, setLocations] = useState<string[]>(product?.locations ?? [PRODUCT_LOCATIONS[0]]);
  const [manageStock, setManageStock] = useState(product?.manageStock ?? true);
  const [taxType, setTaxType] = useState<"Exclusive" | "Inclusive">(product?.taxType ?? "Exclusive");
  // Combo isn't offered here, so an edited product is Single or Variable
  const [type, setType] = useState<ProductType>(product?.type === "Variable" ? "Variable" : "Single");

  // single product pricing
  const [purchase, setPurchase] = useState(product ? fixed(product.purchasePrice) : "");
  const [selling, setSelling] = useState(product ? fixed(product.sellingPrice) : "");
  const [marginPct, setMarginPct] = useState(() => {
    const m = product && margin(fixed(product.purchasePrice), fixed(product.sellingPrice));
    return m != null ? fixed(m) : "0.00";
  });

  const [variations, setVariations] = useState<Variation[]>(() =>
    product?.variations.length
      ? product.variations.map((v, i) => ({
          key: ++variationKey,
          value: v.name,
          sku: v.sku,
          purchase: fixed(v.purchasePrice ?? product.purchasePrice),
          selling: fixed(v.sellingPrice ?? product.sellingPrice),
          age: v.ageVerification ?? false,
          origin: i,
        }))
      : [blankVariation()],
  );

  const sellingLabel = taxType === "Inclusive" ? "Inc. tax" : "Exc. tax";

  // Stock tab (edit only): a row per variation, keyed by the row's key so
  // adding or removing variations never moves quantities onto another row
  const stockRows: StockRow[] = !product
    ? []
    : type === "Variable"
      ? variations.map((v) => ({
          key: String(v.key),
          name: `${product.name} - ${v.value.trim() || "new variation"}`,
          current: v.origin !== undefined ? (product.variations[v.origin]?.stock ?? 0) : 0,
        }))
      : [{ key: "single", name: product.name, current: product.stock }];
  const [stockLines, setStockLines] = useState(() =>
    product ? initialStockLines(product.locations, stockRows, product.purchasePrice) : {},
  );
  const [stockTime] = useState(() => new Date());

  // Prices group tab (edit only): price per active group and row key, as text
  const priceGroups = usePriceGroups().filter((g) => g.active);
  const [groupPrices, setGroupPrices] = useState<Record<number, Record<string, string>>>(() => {
    if (!product?.groupPrices) return {};
    const keyOf = (sku: string) => {
      const row = variations.find((v) => v.sku === sku);
      return row ? String(row.key) : sku === product.sku ? "single" : null;
    };
    return Object.fromEntries(
      Object.entries(product.groupPrices).map(([gid, bySku]) => [
        gid,
        Object.fromEntries(
          Object.entries(bySku).flatMap(([sku, price]) => {
            const key = keyOf(sku);
            return key ? [[key, fixed(price)]] : [];
          }),
        ),
      ]),
    );
  });

  function changePurchase(value: string) {
    setPurchase(value);
    if (value !== "") setSelling(fixed(num(value) * (1 + num(marginPct) / 100)));
  }
  function changeMargin(value: string) {
    setMarginPct(value);
    if (purchase !== "") setSelling(fixed(num(purchase) * (1 + num(value) / 100)));
  }
  function changeSelling(value: string) {
    setSelling(value);
    const m = margin(purchase, value);
    if (m !== null) setMarginPct(fixed(m));
  }

  function updateVariation(key: number, patch: Partial<Variation>) {
    setVariations((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }
  /** Adds a template's values as rows: empty rows are filled first, existing values skipped. */
  function applyTemplate(id: number) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setVariations((prev) => {
      const have = new Set(prev.map((v) => v.value.trim().toLowerCase()).filter(Boolean));
      const queue = template.values.filter((v) => !have.has(v.toLowerCase()));
      const filled = prev.map((v) => (!v.value.trim() && queue.length ? { ...v, value: queue.shift()! } : v));
      return [...filled, ...queue.map((value) => ({ ...blankVariation(), value }))];
    });
  }

  /** The header "copy" buttons: first row's price to every row. */
  function copyToAll(field: "purchase" | "selling") {
    setVariations((prev) => prev.map((v) => ({ ...v, [field]: prev[0][field] })));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const addAnother = submitter?.value === "another";
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();

    const next: Errors = {};
    if (!value("name")) next.name = "Product name is required";
    if (editing && !value("sku")) next.sku = "SKU is required";
    if (!unit) next.unit = "Pick a unit";
    if (type === "Single" && purchase === "") next.purchase = "Purchase price is required";
    if (type === "Variable" && variations.some((v) => !v.value.trim() || v.purchase === "" || v.selling === ""))
      next.variations = "Every variation needs a value, a purchase price and a selling price";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // the errors are all on the Edit tab
      onTabChange?.("edit");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const { id, sku } = product ?? nextIds(products);
    const productSku = value("sku") || sku;
    const saved: DemoProduct = {
      ...(product ?? {}),
      id,
      name: value("name"),
      sku: productSku,
      type,
      category: category || null,
      brand: brand || null,
      unit,
      tax: value("tax") || null,
      locations,
      purchasePrice: type === "Single" ? num(purchase) : num(variations[0].purchase),
      sellingPrice: type === "Single" ? num(selling) : num(variations[0].selling),
      stock: product?.stock ?? 0,
      sold: product?.sold ?? 0,
      transferred: product?.transferred ?? 0,
      adjusted: product?.adjusted ?? 0,
      active: product?.active ?? true,
      notForSelling: product?.notForSelling ?? false,
      barcodeType: value("barcode"),
      alertQuantity: manageStock && value("alertQuantity") ? num(value("alertQuantity")) : null,
      manageStock,
      ageVerification: data.has("ageVerification"),
      taxType,
      shelves: Object.fromEntries(
        locations.map((l) => [
          l,
          { rack: value(`rack-${l}`), row: value(`row-${l}`), position: value(`position-${l}`) },
        ]),
      ),
      variations:
        type === "Variable"
          ? variations.map((v, i) => {
              // a row that came from a saved variation keeps its stock and sales
              const before = v.origin !== undefined ? product?.variations[v.origin] : undefined;
              return {
                name: v.value.trim(),
                sku: v.sku.trim() || `${productSku}-${i + 1}`,
                // edit: the Stock tab decides; a new product starts empty
                stock: product ? quantityOf(stockLines, locations, String(v.key)) : 0,
                sold: before?.sold ?? 0,
                purchasePrice: num(v.purchase),
                sellingPrice: num(v.selling),
                ageVerification: v.age,
              };
            })
          : [],
    };
    if (saved.variations.length) saved.stock = saved.variations.reduce((t, v) => t + v.stock, 0);
    else if (product) saved.stock = quantityOf(stockLines, locations, "single");

    if (product) {
      const skuOfKey = (key: string) =>
        key === "single" ? (type === "Single" ? saved.sku : null) : saved.variations[variations.findIndex((v) => String(v.key) === key)]?.sku ?? null;
      const next = { ...(product.groupPrices ?? {}) };
      for (const g of priceGroups) {
        const bySku: Record<string, number> = {};
        for (const [key, text] of Object.entries(groupPrices[g.id] ?? {})) {
          const sku = skuOfKey(key);
          // blank means "no group price" — the default price applies
          if (sku && text.trim() !== "") bySku[sku] = num(text);
        }
        next[g.id] = bySku;
      }
      saved.groupPrices = next;
    }

    if (product) {
      // history: each variation's (or the product's) change, at the first location
      const before = (sku: string) =>
        product.variations.length
          ? (product.variations.find((v) => v.sku === sku)?.stock ?? 0)
          : product.stock;
      const changes = saved.variations.length
        ? saved.variations.map((v) => ({ sku: v.sku, qty: v.stock - before(v.sku), location: locations[0] ?? null }))
        : [{ sku: saved.sku, qty: saved.stock - product.stock, location: locations[0] ?? null }];
      const logged = logStock(saved, changes);
      updateProducts((prev) => prev.map((p) => (p.id === id ? logged : p)));
    }
    else updateProducts((prev) => [...prev, saved]);

    if (addAnother) onAddedAnother(saved.name);
    else if (product) router.push("/products");
    // like the old flow: a stocked new product goes straight to its opening stock
    else router.push(manageStock ? `/products/${id}/opening-stock` : "/products");
  }

  const actionButtons = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href="/products" className={buttonStyles({ variant: "secondary" })}>
        Cancel
      </Link>
      <Button type="submit" form={FORM_ID} value="another" variant="secondary">
        {editing ? "Update and add another" : "Save and add another"}
      </Button>
      <Button type="submit" form={FORM_ID} value="save" variant="brand">
        {editing ? "Update" : "Save"}
      </Button>
    </div>
  );

  return (
    <>
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit}
        onInput={(event) => {
          const field = (event.target as HTMLInputElement).name as keyof Errors;
          if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
        }}
        className="flex flex-col gap-5"
      >
        {actionButtons}

        {/* Edit tab — kept mounted while hidden so its fields are still submitted */}
        <div className={cn("flex flex-col gap-5", tab !== "edit" && "hidden")}>
        <Section title="Product details" description="What the product is and where it's sold.">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              name="name"
              label="Product name *"
              placeholder="Product name"
              defaultValue={product?.name}
              error={errors.name}
            />
            <Input
              name="sku"
              label={editing ? "SKU *" : "SKU"}
              placeholder="SKU"
              defaultValue={product?.sku}
              hint={editing ? "Must be unique" : "Leave blank to autogenerate"}
              error={errors.sku}
              className="font-mono"
            />
            <SelectField
              label="Barcode type *"
              name="barcode"
              defaultValue={product?.barcodeType ?? "UPC-A"}
              options={BARCODE_TYPES}
            />

            <SelectField
              label="Unit *"
              value={unit}
              onChange={setUnit}
              options={units}
              error={errors.unit}
              onAdd={() => setQuickAdd("unit")}
            />
            <SelectField
              label="Brand"
              value={brand}
              onChange={setBrand}
              options={brands}
              placeholder="Please select"
              onAdd={() => setQuickAdd("brand")}
            />
            <SelectField
              label="Category"
              value={category}
              onChange={setCategory}
              options={categories}
              placeholder="Please select"
              onAdd={() => setQuickAdd("category")}
            />
          </div>

          <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-3">
            <fieldset>
              <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Business locations
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRODUCT_LOCATIONS.map((l) => {
                  const on = locations.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setLocations((prev) => (on ? prev.filter((x) => x !== l) : [...prev, l]))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-all",
                        on
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                          : "border-line text-muted hover:border-brand-500/50 hover:text-foreground",
                      )}
                    >
                      <Icon name={on ? "close" : "plus"} className="h-3.5 w-3.5" />
                      {l} <span className="opacity-70">({LOCATION_CODES[l]})</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">Where this product can be sold.</p>
            </fieldset>

            <Toggle
              name="manageStock"
              checked={manageStock}
              onChange={setManageStock}
              label="Manage stock?"
              hint="Enable stock management at product level"
            />
            <Toggle
              name="ageVerification"
              defaultChecked={product?.ageVerification}
              label="Age verification required"
              hint="Customer age verification required before selling this product"
            />

            <Input
              name="alertQuantity"
              label="Alert quantity"
              placeholder="Alert quantity"
              inputMode="decimal"
              defaultValue={product?.alertQuantity != null ? fixed(product.alertQuantity) : undefined}
              disabled={!manageStock}
              hint="Get a low stock alert below this quantity"
            />
          </div>
        </Section>

        <Section title="Pricing" description="Tax, product type and prices.">
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField
              label="Applicable tax (inventory use only)"
              name="tax"
              defaultValue={product?.tax ?? ""}
              options={TAXES}
              placeholder="Please select"
            />
            <SelectField
              label="Selling price tax type *"
              value={taxType}
              onChange={(v) => setTaxType(v as "Exclusive" | "Inclusive")}
              options={["Inclusive", "Exclusive"]}
            />
            <SelectField
              label="Product type *"
              value={type}
              onChange={(v) => setType(v as ProductType)}
              options={["Single", "Variable"]}
              disabled={editing}
              hint={
                editing
                  ? "Can't be changed once the product exists."
                  : type === "Single"
                  ? "One price and one stock count."
                  : "Sizes, colors or flavors — each with its own SKU and price."
              }
            />
          </div>

          {type === "Single" ? (
            <div className="mt-5 grid overflow-hidden rounded-xl border border-line md:grid-cols-4">
              <PriceCell title="Purchase price" sub="Exc. tax *">
                <MoneyInput name="purchase" value={purchase} onChange={changePurchase} error={Boolean(errors.purchase)} />
                {errors.purchase && <p className="mt-1 text-xs text-red-600">{errors.purchase}</p>}
              </PriceCell>
              <PriceCell title="× Margin (%)" sub="Selling price follows">
                <input
                  value={marginPct}
                  onChange={(event) => changeMargin(event.target.value.replace(/[^\d.-]/g, ""))}
                  inputMode="decimal"
                  aria-label="Margin percent"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                />
              </PriceCell>
              <PriceCell title="Selling price" sub={sellingLabel}>
                <MoneyInput name="selling" value={selling} onChange={changeSelling} />
              </PriceCell>
              <PriceCell title="Product image" sub="Max 5 MB, square (1:1)">
                <FileInput name="image" />
              </PriceCell>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-line">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2.5">
                <p className="text-[13px] font-semibold">
                  Variation values
                  <span className="ml-2 font-normal text-muted">
                    {variations.length} variation{variations.length === 1 ? "" : "s"}
                  </span>
                </p>
                {/* fills rows from Inventory -> Variations; keeps anything already typed */}
                <label className="flex items-center gap-2 text-xs text-muted">
                  Use a variation template
                  <select
                    value=""
                    onChange={(event) => applyTemplate(Number(event.target.value))}
                    className="rounded-lg border border-line bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-brand-500"
                  >
                    <option value="">Pick one…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.values.join(", ")})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-[13px]">
                  <thead>
                    <tr className="border-y border-line text-xs text-muted">
                      <th className="px-3 py-2 font-medium">Value *</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">
                        <CopyHeader label="Purchase price" sub="Exc. tax" onCopy={() => copyToAll("purchase")} />
                      </th>
                      <th className="px-3 py-2 font-medium">
                        <CopyHeader label="Selling price" sub={sellingLabel} onCopy={() => copyToAll("selling")} />
                      </th>
                      <th className="px-3 py-2 font-medium">Image</th>
                      <th className="px-3 py-2 text-center font-medium">Age verification</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {variations.map((v, i) => {
                      const m = margin(v.purchase, v.selling);
                      return (
                        <tr key={v.key} className="border-b border-line align-top last:border-0">
                          <td className="px-3 py-2">
                            <CellInput
                              value={v.value}
                              placeholder={i === 0 ? "e.g. Red" : "Value"}
                              onChange={(value) => updateVariation(v.key, { value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <CellInput
                              value={v.sku}
                              placeholder="Auto"
                              mono
                              onChange={(sku) => updateVariation(v.key, { sku })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <MoneyInput
                              value={v.purchase}
                              onChange={(purchase) => updateVariation(v.key, { purchase })}
                              compact
                            />
                            {m !== null && (
                              <p className={cn("mt-1 text-xs font-medium", m >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                Margin: {PERCENT.format(m)}%
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <MoneyInput
                              value={v.selling}
                              onChange={(selling) => updateVariation(v.key, { selling })}
                              compact
                            />
                          </td>
                          <td className="px-3 py-2">
                            <FileInput name={`variationImage${i}`} compact />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              aria-label="Age verification required"
                              checked={v.age}
                              onChange={(event) => updateVariation(v.key, { age: event.target.checked })}
                              className="mt-2 h-4 w-4 accent-brand-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              aria-label="Remove variation"
                              disabled={variations.length === 1}
                              onClick={() => setVariations((prev) => prev.filter((x) => x.key !== v.key))}
                              className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950"
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setVariations((prev) => [...prev, blankVariation()])}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add variation
                </Button>
                {errors.variations && <p className="text-xs text-red-600">{errors.variations}</p>}
              </div>
            </div>
          )}
        </Section>

        </div>

        {product && tab === "stock" && (
          <>
            <StockTables
              rows={stockRows}
              locations={locations}
              unit={unit}
              defaultCost={product.purchasePrice}
              lines={stockLines}
              onChange={setStockLines}
              stamp={stockStamp(stockTime)}
            />
            <p className="text-right text-[13px] text-muted">
              Total amount (exc. tax):{" "}
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatUsd(stockTotal(stockLines, locations, stockRows, product.purchasePrice))}
              </span>
            </p>
          </>
        )}

        {product && tab === "prices" && (
          <PricesGroup
            name={product.name}
            sku={product.sku}
            rows={
              type === "Variable"
                ? variations.map((v) => ({
                    key: String(v.key),
                    label: `${product.name} - ${v.value.trim() || "new variation"}`,
                    sku: v.sku,
                    price: num(v.selling),
                  }))
                : [{ key: "single", label: product.name, sku: product.sku, price: num(selling) }]
            }
            taxLabel={sellingLabel}
            groups={priceGroups}
            values={groupPrices}
            onChange={(groupId, key, value) =>
              setGroupPrices((prev) => ({ ...prev, [groupId]: { ...prev[groupId], [key]: value } }))
            }
          />
        )}

        <Section title="Rack, row & position" description="Where to find it on the shelves, per location.">
          {locations.length === 0 ? (
            <p className="text-[13px] text-muted">Pick a business location above to add shelf details.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {locations.map((l) => (
                <fieldset key={l} className="rounded-xl border border-line p-4">
                  <legend className="px-1 text-[13px] font-semibold">
                    {l} <span className="font-normal text-muted">({LOCATION_CODES[l]})</span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name={`rack-${l}`} label="Rack" placeholder="Rack" defaultValue={product?.shelves?.[l]?.rack} />
                    <Input name={`row-${l}`} label="Row" placeholder="Row" defaultValue={product?.shelves?.[l]?.row} />
                    <Input
                      name={`position-${l}`}
                      label="Position"
                      placeholder="Position"
                      defaultValue={product?.shelves?.[l]?.position}
                    />
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </Section>

        {/* action bar stays pinned at the bottom of the long form */}
        <div className="sticky bottom-4 rounded-xl border border-line bg-background/90 px-4 py-3 shadow-lg shadow-navy-950/[0.06] backdrop-blur">
          {actionButtons}
        </div>
      </form>

      {/* "+" next to Unit adds a real unit (name, short name, decimals) to Inventory -> Units */}
      {quickAdd === "unit" && (
        <UnitDialog
          taken={allUnits}
          onClose={() => setQuickAdd(null)}
          onSave={(values) => {
            updateUnits((prev) => [...prev, { id: Math.max(0, ...prev.map((u) => u.id)) + 1, ...values }]);
            setUnit(values.shortName);
            setQuickAdd(null);
          }}
        />
      )}

      {quickAdd && quickAdd !== "unit" && (
        <QuickAddDialog
          kind={quickAdd}
          onClose={() => setQuickAdd(null)}
          onAdd={(name) => {
            if (quickAdd === "brand") {
              setBrands((prev) => [...prev, name]);
              setBrand(name);
            } else {
              setCategories((prev) => [...prev, name]);
              setCategory(name);
            }
            setQuickAdd(null);
          }}
        />
      )}
    </>
  );
}

// ---------- Prices group tab ----------

/**
 * Selling prices per variation: the default price, then a price per active
 * selling price group (Inventory -> Selling Price Group). A blank group price
 * means the default applies.
 */
function PricesGroup({
  name,
  sku,
  rows,
  taxLabel,
  groups,
  values,
  onChange,
}: {
  name: string;
  sku: string;
  rows: { key: string; label: string; sku: string; price: number }[];
  taxLabel: string;
  groups: PriceGroup[];
  values: Record<number, Record<string, string>>;
  onChange: (groupId: number, key: string, value: string) => void;
}) {
  return (
    <Card
      title={
        <div>
          <h2 className="text-sm font-semibold">
            Product: {name} <span className="font-normal text-muted">({sku})</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {groups.length
              ? "Leave a group price blank to use the default price."
              : "Add selling price groups under Inventory → Selling Price Group to set their prices here."}
          </p>
        </div>
      }
      bodyClassName="px-0 pb-0"
    >
      <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-y border-line bg-surface text-xs text-muted">
            <th className="px-5 py-2.5 font-medium">Variation</th>
            <th className="px-5 py-2.5 text-right font-medium">Default selling price ({taxLabel})</th>
            {groups.map((g) => (
              <th key={g.id} className="px-5 py-2.5 font-medium">
                {g.name} ({taxLabel})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                {row.label}
                {row.sku && <span className="ml-1.5 font-mono text-xs text-muted">({row.sku})</span>}
              </td>
              <td className="px-5 py-3 text-right font-medium tabular-nums">{formatUsd(row.price)}</td>
              {groups.map((g) => (
                <td key={g.id} className="px-5 py-2">
                  <span className="relative block w-36">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                      $
                    </span>
                    <input
                      aria-label={`${g.name} price for ${row.label}`}
                      value={values[g.id]?.[row.key] ?? ""}
                      onChange={(event) => onChange(g.id, row.key, event.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal"
                      placeholder={row.price.toFixed(2)}
                      className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-7 pr-3 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
                    />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}

// ---------- pieces ----------

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card
      title={
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
      }
      bodyClassName="border-t border-line pt-4"
    >
      {children}
    </Card>
  );
}

const fieldClass =
  "w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-9 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:bg-navy-900";

/** Native select, controlled (value/onChange) or not (name/defaultValue), with an optional "+" add button. */
function SelectField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  hint,
  error,
  onAdd,
  disabled,
}: {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  hint?: string;
  error?: string;
  onAdd?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="flex gap-2">
          <span className="relative flex-1">
            <select
              name={name}
              value={value}
              defaultValue={defaultValue}
              onChange={onChange && ((event) => onChange(event.target.value))}
              disabled={disabled}
              className={cn(
                fieldClass,
                "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
                error ? "border-red-500" : "border-zinc-300 dark:border-navy-700",
              )}
            >
              {placeholder !== undefined && <option value="">{placeholder}</option>}
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
          </span>
          {onAdd && (
            <button
              type="button"
              aria-label={`Add a new ${label.replace(" *", "").toLowerCase()}`}
              title={`Add a new ${label.replace(" *", "").toLowerCase()}`}
              onClick={onAdd}
              className="shrink-0 rounded-lg border border-zinc-300 px-2.5 text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-brand-900"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          )}
        </span>
      </label>
      {(error || hint) && (
        <p className={cn("text-xs", error ? "text-red-600" : "text-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-surface">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange && ((event) => onChange(event.target.checked))}
        className="mt-0.5 h-4 w-4 accent-brand-500"
      />
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function PriceCell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="border-b border-line last:border-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="bg-surface px-4 py-2">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MoneyInput({
  name,
  value,
  onChange,
  error,
  compact,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  compact?: boolean;
}) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        placeholder="0.00"
        className={cn(
          "w-full rounded-lg border bg-white pl-7 pr-3 text-sm tabular-nums outline-none focus:ring-2 dark:bg-navy-900",
          compact ? "py-1.5" : "py-2",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
            : "border-zinc-300 focus:border-brand-500 focus:ring-brand-500/25 dark:border-navy-700",
        )}
      />
    </span>
  );
}

function CellInput({
  value,
  placeholder,
  mono,
  onChange,
}: {
  value: string;
  placeholder: string;
  mono?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900",
        mono && "font-mono text-xs",
      )}
    />
  );
}

function CopyHeader({ label, sub, onCopy }: { label: string; sub: string; onCopy: () => void }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span>
        <span className="block">{label}</span>
        <span className="block text-[11px] font-normal">{sub}</span>
      </span>
      <button
        type="button"
        onClick={onCopy}
        title="Copy the first row's price to every row"
        aria-label={`Copy first ${label.toLowerCase()} to all rows`}
        className="rounded-md border border-line p-1 text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        <Icon name="columns" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function FileInput({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <input
      type="file"
      name={name}
      accept="image/*"
      className={cn(
        "w-full text-xs text-muted file:mr-2 file:rounded-lg file:border file:border-line file:bg-surface file:px-2.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-background",
        compact ? "file:py-1" : "file:py-1.5",
      )}
    />
  );
}

const QUICK_ADD: Record<"unit" | "brand" | "category", { title: string; placeholder: string; icon: IconName }> = {
  unit: { title: "Add unit", placeholder: "e.g. Dozen", icon: "cube" },
  brand: { title: "Add brand", placeholder: "e.g. Cloud Co", icon: "tag" },
  category: { title: "Add category", placeholder: "e.g. Vapes", icon: "grid" },
};

/** The "+" next to unit / brand / category: name a new option and select it. */
function QuickAddDialog({
  kind,
  onClose,
  onAdd,
}: {
  kind: "unit" | "brand" | "category";
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const meta = QUICK_ADD[kind];

  return (
    <Modal
      title={meta.title}
      description="It's added to the list and selected for this product."
      onClose={onClose}
      className="max-w-sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => (name.trim() ? onAdd(name.trim()) : setError(true))}
          >
            Save
          </Button>
        </>
      }
    >
      <Input
        autoFocus
        label="Name *"
        placeholder={meta.placeholder}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && name.trim()) onAdd(name.trim());
        }}
        leading={<Icon name={meta.icon} className="h-4 w-4" />}
        error={error ? "Enter a name" : undefined}
      />
    </Modal>
  );
}
