"use client";

/**
 * Add stock adjustment, as in the old Opal POS: business location, reference
 * no, date and adjustment type, then the products with quantity, unit price
 * and subtotal, the total amount recovered and the reason.
 *
 * Saving takes the quantities out of stock and logs them in stock history.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { LOCATION_CODES, PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { nowLocal } from "@/components/purchases/payment-dialog";
import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_TYPE_HELP,
  RECOVERED_HELP,
  adjustmentTotals,
  applyAdjustment,
  nextAdjustmentRef,
  updateAdjustments,
  useAdjustments,
  type AdjustmentType,
  type StockAdjustment,
} from "@/components/stock-adjustments/adjustments-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const decimal = (v: string) => v.replace(/[^\d.]/g, "");

type Draft = { sku: string; productId: number; name: string; unit: string; stock: number | null; qty: string; unitPrice: string };

export function AdjustmentForm() {
  const router = useRouter();
  const [products] = useDemoProducts();
  const adjustments = useAdjustments();

  const [location, setLocation] = useState("");
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(nowLocal);
  const [type, setType] = useState<AdjustmentType | "">("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Draft[]>([]);
  const [recovered, setRecovered] = useState("0");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const t = adjustmentTotals({ lines: lines.map((l) => ({ ...l, qty: num(l.qty), unitPrice: num(l.unitPrice) })) });

  // only products kept at the chosen location
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !location) return [];
    return products
      .filter((p) => p.active && p.locations.includes(location))
      .flatMap((p) =>
        (p.variations.length
          ? p.variations.map((v) => ({ p, sku: v.sku, name: `${p.name} - ${v.name}`, stock: v.stock, cost: v.purchasePrice ?? p.purchasePrice }))
          : [{ p, sku: p.sku, name: p.name, stock: p.stock, cost: p.purchasePrice }]
        ).filter((m) => `${m.name} ${m.sku}`.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [search, products, location]);

  function addLine(m: (typeof matches)[number]) {
    setLines((prev) =>
      prev.some((l) => l.sku === m.sku)
        ? prev.map((l) => (l.sku === m.sku ? { ...l, qty: String(num(l.qty) + 1) } : l))
        : [
            ...prev,
            {
              sku: m.sku,
              productId: m.p.id,
              name: m.name,
              unit: m.p.unit,
              stock: m.p.manageStock === false ? null : m.stock,
              qty: "1",
              unitPrice: m.cost.toFixed(2),
            },
          ],
    );
    setSearch("");
  }

  function save() {
    const next: string[] = [];
    if (!location) next.push("Pick the business location");
    if (!date) next.push("Pick the date");
    if (!type) next.push("Pick the adjustment type");
    if (lines.length === 0) next.push("Add at least one product");
    for (const l of lines) {
      if (num(l.qty) <= 0) next.push(`${l.name}: quantity must be above zero`);
      else if (l.stock !== null && num(l.qty) > l.stock) next.push(`${l.name}: only ${l.stock.toFixed(2)} ${l.unit} in stock`);
    }
    if (num(recovered) > t.total) next.push("Total amount recovered can't be more than the total amount");
    if (ref.trim() && adjustments.some((x) => x.ref === ref.trim())) next.push(`${ref.trim()} is already used`);
    setErrors(next);
    if (next.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const adjustment: StockAdjustment = {
      id: Math.max(0, ...adjustments.map((x) => x.id)) + 1,
      ref: ref.trim() || nextAdjustmentRef(adjustments),
      date,
      location,
      type: type as AdjustmentType,
      lines: lines.map((l) => ({ productId: l.productId, sku: l.sku, name: l.name, qty: num(l.qty), unitPrice: num(l.unitPrice) })),
      recovered: num(recovered),
      reason: reason.trim(),
      addedBy: "Adnan Ahmed",
    };
    updateAdjustments((prev) => [...prev, adjustment]);
    updateProducts((prev) => applyAdjustment(prev, adjustment, 1));
    router.push("/stock-adjustments");
  }

  return (
    <div className="flex flex-col gap-5">
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {errors.join(" · ")}
        </div>
      )}

      <Card bodyClassName="pt-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Business location *">
            <Select
              value={location}
              onChange={(v) => {
                setLocation(v);
                // products are listed per location, so a new location starts over
                setLines([]);
              }}
              label="Business location"
              icon
            >
              <option value="">Please select</option>
              {PRODUCT_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l} ({LOCATION_CODES[l]})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference no" hint="Leave empty to autogenerate">
            <input value={ref} onChange={(event) => setRef(event.target.value)} placeholder={nextAdjustmentRef(adjustments)} className={cn(inputClass, "font-mono")} />
          </Field>
          <Field label="Date *">
            <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Adjustment type *" help={ADJUSTMENT_TYPE_HELP}>
            <Select value={type} onChange={(v) => setType(v as AdjustmentType)} label="Adjustment type">
              <option value="">Please select</option>
              {ADJUSTMENT_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Search products" bodyClassName="border-t border-line pt-4">
        <div className="relative mx-auto max-w-3xl">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            disabled={!location}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) {
                event.preventDefault();
                addLine(matches[0]);
              }
            }}
            placeholder={location ? "Search products for stock adjustment" : "Pick the business location first"}
            aria-label="Search products to adjust"
            className={cn(inputClass, "pl-9 disabled:bg-surface")}
          />
          {search.trim() && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-background p-1 shadow-lg shadow-navy-950/10">
              {matches.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">No products match at {location}.</li>}
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

        <div className="mx-auto mt-4 max-w-5xl overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
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
                const over = l.stock !== null && num(l.qty) > l.stock;
                return (
                  <tr key={l.sku} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{l.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono">{l.sku}</span>
                        {l.stock !== null && <> · {l.stock.toFixed(2)} {l.unit} in stock</>}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("flex w-36 overflow-hidden rounded-lg border focus-within:border-brand-500", over ? "border-red-500" : "border-zinc-300 dark:border-navy-700")}>
                        <input
                          aria-label={`Quantity of ${l.name}`}
                          value={l.qty}
                          onChange={(event) => setLines((prev) => prev.map((x) => (x.sku === l.sku ? { ...x, qty: decimal(event.target.value) } : x)))}
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
                          onChange={(event) => setLines((prev) => prev.map((x) => (x.sku === l.sku ? { ...x, unitPrice: decimal(event.target.value) } : x)))}
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
                        onClick={() => setLines((prev) => prev.filter((x) => x.sku !== l.sku))}
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
                    Search above to add the damaged, lost or stolen products.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface">
                <td colSpan={5} className="px-3 py-2.5 text-right text-[13px]">
                  <span className="text-muted">Total amount:</span> <b className="tabular-nums">{USD.format(t.total)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card bodyClassName="pt-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Total amount recovered" help={RECOVERED_HELP}>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
              <input
                value={recovered}
                onChange={(event) => setRecovered(decimal(event.target.value))}
                inputMode="decimal"
                aria-label="Total amount recovered"
                className={cn(inputClass, "pl-7")}
              />
            </span>
          </Field>
          <Field label="Reason">
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-4 border-t border-line pt-4">
          <p className="text-[13px] text-muted">
            Net loss: <span className="text-lg font-semibold tabular-nums text-foreground">{USD.format(Math.max(0, t.total - num(recovered)))}</span>
          </p>
          <Link href="/stock-adjustments" className="inline-flex items-center rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
            Cancel
          </Link>
          <Button type="button" variant="brand" onClick={save}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900";

function Field({ label, hint, help, children }: { label: string; hint?: string; help?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {help && (
          <span title={help} aria-label={help} className="text-brand-500">
            <Icon name="info" className="h-4 w-4" />
          </span>
        )}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Select({ value, onChange, children, label, icon }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string; icon?: boolean }) {
  return (
    <span className="relative block w-full">
      {icon && <Icon name="store" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "appearance-none pr-9", icon && "pl-10")}>
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
