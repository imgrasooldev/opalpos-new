"use client";

/**
 * Add purchase return, as in the old Opal POS: supplier, location, reference,
 * date and document, then the products sent back with quantity and unit
 * price, an optional purchase tax and the total. Saving takes the quantities
 * out of stock.
 *
 * Opened from a purchase (`purchaseId`), supplier and location come from it
 * and the lines are its products: each can send back at most what that
 * purchase brought in, less what earlier returns already sent back.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { updateProducts, useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { LOCATION_CODES, PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import { nowLocal } from "@/components/purchases/payment-dialog";
import {
  applyReturn,
  nextReturnRef,
  returnTotals,
  updatePurchaseReturns,
  usePurchaseReturns,
  type PurchaseReturn,
} from "@/components/purchases/purchase-returns-data";
import { netUnitCost, usePurchases, useSuppliers, type Purchase } from "@/components/purchases/purchases-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;

type Draft = {
  key: string;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  qty: string;
  unitPrice: string;
  /** Most that can go back: the stock on hand, or what's left of the parent purchase. */
  max: number;
};

/** Waits for the browser stores, so a purchase added this session is found. */
export function PurchaseReturnForm({ purchaseId }: { purchaseId?: number }) {
  const hydrated = useHydrated();
  const purchases = usePurchases();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const parent = purchaseId ? purchases.find((p) => p.id === purchaseId) : undefined;
  if (purchaseId && !parent)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That purchase doesn&apos;t exist any more.{" "}
          <Link href="/purchases" className="font-medium text-brand-500 hover:underline">
            Back to purchases
          </Link>
        </p>
      </Card>
    );
  return <ReturnForm parent={parent} />;
}

function ReturnForm({ parent }: { parent?: Purchase }) {
  const router = useRouter();
  const [products] = useDemoProducts();
  const suppliers = useSuppliers();
  const returns = usePurchaseReturns();

  const stockOf = (productId: number, sku: string) => {
    const p = products.find((x) => x.id === productId);
    return (p?.variations.length ? p.variations.find((v) => v.sku === sku)?.stock : p?.stock) ?? 0;
  };
  const unitOf = (productId: number) => products.find((x) => x.id === productId)?.unit ?? "Pcs";

  const [supplierId, setSupplierId] = useState(parent ? String(parent.supplierId) : "");
  const [location, setLocation] = useState(parent?.location ?? "");
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(nowLocal);
  const [search, setSearch] = useState("");
  const [tax, setTax] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [lines, setLines] = useState<Draft[]>(() =>
    (parent?.lines ?? []).map((l) => {
      const returned = returns
        .filter((r) => r.parentRef === parent!.ref)
        .flatMap((r) => r.lines)
        .filter((x) => x.sku === l.sku)
        .reduce((t, x) => t + x.qty, 0);
      return {
        key: l.sku,
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unit: unitOf(l.productId),
        qty: "0",
        unitPrice: netUnitCost(l).toFixed(2),
        max: Math.min(l.qty - returned, stockOf(l.productId, l.sku)),
      };
    }),
  );

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .flatMap((p) =>
        (p.variations.length
          ? p.variations.map((v) => ({ p, sku: v.sku, name: `${p.name} - ${v.name}`, stock: v.stock, cost: v.purchasePrice ?? p.purchasePrice }))
          : [{ p, sku: p.sku, name: p.name, stock: p.stock, cost: p.purchasePrice }]
        ).filter((m) => `${m.name} ${m.sku}`.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [search, products]);

  function addLine(m: (typeof matches)[number]) {
    setLines((prev) =>
      prev.some((l) => l.sku === m.sku)
        ? prev.map((l) => (l.sku === m.sku ? { ...l, qty: String(num(l.qty) + 1) } : l))
        : [
            ...prev,
            { key: m.sku, productId: m.p.id, sku: m.sku, name: m.name, unit: m.p.unit, qty: "1", unitPrice: m.cost.toFixed(2), max: m.stock },
          ],
    );
    setSearch("");
  }

  const saved = lines.filter((l) => num(l.qty) > 0);
  const t = returnTotals({
    lines: saved.map((l) => ({ ...l, qty: num(l.qty), unitPrice: num(l.unitPrice) })),
    tax: tax || null,
    payments: [],
  });
  const supplier = suppliers.find((s) => s.id === Number(supplierId));

  function submit() {
    const next: string[] = [];
    if (!supplier) next.push("Pick a supplier");
    if (!location) next.push("Pick a business location");
    if (saved.length === 0) next.push("Add at least one product with a quantity");
    for (const l of saved)
      if (num(l.qty) > l.max + 0.0001)
        next.push(`${l.name}: only ${l.max.toFixed(2)} ${l.unit} can be returned`);
    setErrors(next);
    if (next.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const ret: PurchaseReturn = {
      id: Math.max(0, ...returns.map((r) => r.id)) + 1,
      ref: ref.trim() || nextReturnRef(returns),
      date,
      location,
      supplierId: supplier!.id,
      parentRef: parent?.ref ?? null,
      lines: saved.map((l) => ({ productId: l.productId, sku: l.sku, name: l.name, qty: num(l.qty), unitPrice: num(l.unitPrice) })),
      tax: tax || null,
      payments: [],
      addedBy: "Adnan Ahmed",
    };
    updatePurchaseReturns((prev) => [...prev, ret]);
    updateProducts((prev) => applyReturn(prev, ret, supplier!.name, 1));
    router.push("/purchase-returns");
  }

  return (
    <div className="flex flex-col gap-5">
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {errors.join(" · ")}
        </div>
      )}

      {parent && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-700 dark:border-brand-800 dark:bg-brand-900 dark:text-brand-100">
          <Icon name="refund" className="h-4 w-4" />
          Returning goods from purchase <span className="font-mono font-medium">{parent.ref}</span>
        </div>
      )}

      <Card bodyClassName="pt-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Supplier *">
            <Select value={supplierId} onChange={setSupplierId} disabled={Boolean(parent)} icon="users">
              <option value="">Please select</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Business location *">
            <Select value={location} onChange={setLocation} disabled={Boolean(parent)} icon="store">
              <option value="">Please select</option>
              {PRODUCT_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l} ({LOCATION_CODES[l]})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference no" hint="Leave empty to autogenerate">
            <input value={ref} onChange={(event) => setRef(event.target.value)} placeholder={nextReturnRef(returns)} className={cn(inputClass, "font-mono")} />
          </Field>
          <Field label="Date *">
            <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Attach document" hint="Max 5 MB · .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png" className="xl:col-span-2">
            <input
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
            />
          </Field>
        </div>
      </Card>

      <Card title={parent ? "Products in this purchase" : "Search products"} bodyClassName="border-t border-line pt-4">
        {!parent && (
          <div className="relative mx-auto max-w-3xl">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) {
                  event.preventDefault();
                  addLine(matches[0]);
                }
              }}
              placeholder="Search products"
              aria-label="Search products to return"
              className={cn(inputClass, "pl-9")}
            />
            {search.trim() && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-background p-1 shadow-lg shadow-navy-950/10">
                {matches.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">No products match.</li>}
                {matches.map((m) => (
                  <li key={m.sku}>
                    <button
                      type="button"
                      onClick={() => addLine(m)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] hover:bg-surface"
                    >
                      <span>{m.name}</span>
                      <span className="flex items-center gap-3 text-xs text-muted">
                        <span>{m.stock.toFixed(2)} in stock</span>
                        <span className="font-mono">{m.sku}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={cn("overflow-x-auto rounded-lg border border-line", !parent && "mt-4")}>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Quantity</th>
                <th className="px-3 py-2.5 font-medium">Unit price</th>
                <th className="px-3 py-2.5 text-right font-medium">Subtotal</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const over = num(l.qty) > l.max + 0.0001;
                return (
                  <tr key={l.key} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{l.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono">{l.sku}</span> · up to {l.max.toFixed(2)} {l.unit}
                        {parent ? " can go back" : " in stock"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("flex w-36 overflow-hidden rounded-lg border focus-within:border-brand-500", over ? "border-red-500" : "border-zinc-300 dark:border-navy-700")}>
                        <input
                          aria-label={`Quantity of ${l.name}`}
                          value={l.qty}
                          onChange={(event) => {
                            const qty = event.target.value.replace(/[^\d.]/g, "");
                            setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, qty } : x)));
                          }}
                          inputMode="decimal"
                          className="w-full min-w-0 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none dark:bg-navy-900"
                        />
                        <span className="border-l border-zinc-300 bg-surface px-2 py-1.5 text-xs text-muted dark:border-navy-700">{l.unit}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="relative block w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                        <input
                          aria-label={`Unit price of ${l.name}`}
                          value={l.unitPrice}
                          onChange={(event) => {
                            const unitPrice = event.target.value.replace(/[^\d.]/g, "");
                            setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, unitPrice } : x)));
                          }}
                          inputMode="decimal"
                          className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-6 pr-2.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{USD.format(num(l.qty) * num(l.unitPrice))}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${l.name}`}
                        onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                        className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    Search above to add the products you&apos;re sending back.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <Field label="Purchase tax" className="w-full max-w-sm">
            <Select value={tax} onChange={setTax}>
              <option value="">None</option>
              {TAXES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <dl className="grid w-64 grid-cols-2 gap-y-1 text-[13px]">
            <dt className="text-muted">Subtotal:</dt>
            <dd className="text-right tabular-nums">{USD.format(t.net)}</dd>
            <dt className="text-muted">Purchase tax:</dt>
            <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
            <dt className="font-medium">Total amount:</dt>
            <dd className="text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
          </dl>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/purchase-returns" className="inline-flex items-center rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
          Cancel
        </Link>
        <Button type="button" variant="brand" onClick={submit}>
          Submit
        </Button>
      </div>
    </div>
  );
}

// ---------- pieces ----------

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface disabled:text-muted dark:border-navy-700 dark:bg-navy-900";

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  icon,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  icon?: "users" | "store";
  disabled?: boolean;
}) {
  return (
    <span className="relative block w-full">
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9", icon && "pl-10")}
      >
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
