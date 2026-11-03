"use client";

/**
 * Add purchase — same sections and order as the old Opal POS form:
 *
 *   1. supplier (with "+"), reference, date, status, location, pay term, document
 *   2. products: search by name / SKU, then quantity, cost, discount, margin
 *      and selling price per line
 *   3. discount, purchase tax, notes
 *   4. shipping, additional expenses, purchase total
 *   5. payment (with cash denominations) and the payment due
 *
 * Saving a Received purchase adds its quantities to stock and sets the
 * products' purchase / selling prices (see purchases-data.ts).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { LOCATION_CODES, PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import {
  PAYMENT_METHODS,
  PURCHASE_STATUSES,
  lineMargin,
  lineTotal,
  netUnitCost,
  nextRef,
  receiveStock,
  totals,
  updatePurchases,
  updateSuppliers,
  usePurchases,
  useSuppliers,
  type Purchase,
  type PurchaseLine,
  type PurchaseStatus,
  type Supplier,
} from "@/components/purchases/purchases-data";
import { Button } from "@/components/ui/button";
import { CashDenominations, cashTotal } from "@/components/ui/cash-denominations";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const fixed = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

/** "2026-11-03T15:20" in local time — what datetime-local expects. */
function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/** A line while editing: inputs stay text so typing "1." works. */
type Draft = {
  key: string;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  qty: string;
  unitCost: string;
  discountPct: string;
  sellingPrice: string;
  /** Text in the margin box while it's being typed in. */
  marginDraft?: string;
};

const asLine = (d: Draft): PurchaseLine => ({
  productId: d.productId,
  sku: d.sku,
  name: d.name,
  qty: num(d.qty),
  unitCost: num(d.unitCost),
  discountPct: num(d.discountPct),
  sellingPrice: num(d.sellingPrice),
});

type Errors = Partial<Record<"supplier" | "status" | "lines" | "amount", string>>;

export function PurchaseForm() {
  const router = useRouter();
  const [products] = useDemoProducts();
  const suppliers = useSuppliers();
  const purchases = usePurchases();

  const [supplierId, setSupplierId] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(nowLocal);
  const [status, setStatus] = useState<PurchaseStatus | "">("");
  const [location, setLocation] = useState(PRODUCT_LOCATIONS[0]);
  const [payTermN, setPayTermN] = useState("");
  const [payTermUnit, setPayTermUnit] = useState("days");

  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Draft[]>([]);

  const [discountType, setDiscountType] = useState<Purchase["discountType"]>("None");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingDetails, setShippingDetails] = useState("");
  const [shipping, setShipping] = useState("0");
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [expenses, setExpenses] = useState<{ key: number; name: string; amount: string }[]>([]);

  const [amount, setAmount] = useState("0.00");
  const [paidOn, setPaidOn] = useState(nowLocal);
  const [method, setMethod] = useState("Cash");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [paymentNote, setPaymentNote] = useState("");

  const [errors, setErrors] = useState<Errors>({});

  const supplier = suppliers.find((s) => s.id === Number(supplierId));
  const t = totals({
    lines: lines.map(asLine),
    discountType,
    discountAmount: num(discountAmount),
    tax: tax || null,
    shipping: num(shipping),
    expenses: expenses.map((e) => ({ name: e.name, amount: num(e.amount) })),
    payments: [{ amount: num(amount), method, date: paidOn, note: paymentNote }],
  });

  // search: one entry per variation (or product), active products only
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.active)
      .flatMap((p) =>
        (p.variations.length
          ? p.variations.map((v) => ({
              p,
              sku: v.sku,
              name: `${p.name} - ${v.name}`,
              stock: v.stock,
              cost: v.purchasePrice ?? p.purchasePrice,
              price: v.sellingPrice ?? p.sellingPrice,
            }))
          : [{ p, sku: p.sku, name: p.name, stock: p.stock, cost: p.purchasePrice, price: p.sellingPrice }]
        ).filter((m) => `${m.name} ${m.sku}`.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [search, products]);

  function addLine(m: (typeof matches)[number]) {
    setLines((prev) =>
      // the same product again just adds one to its quantity
      prev.some((l) => l.sku === m.sku)
        ? prev.map((l) => (l.sku === m.sku ? { ...l, qty: String(num(l.qty) + 1) } : l))
        : [
            ...prev,
            {
              key: m.sku,
              productId: m.p.id,
              sku: m.sku,
              name: m.name,
              unit: m.p.unit,
              stock: m.stock,
              qty: "1",
              unitCost: fixed(m.cost),
              discountPct: "0",
              sellingPrice: fixed(m.price),
            },
          ],
    );
    setSearch("");
    setErrors((prev) => ({ ...prev, lines: undefined }));
  }

  function update(key: string, patch: Partial<Draft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function save() {
    const next: Errors = {};
    if (!supplier) next.supplier = "Pick a supplier";
    if (!status) next.status = "Pick a purchase status";
    if (lines.length === 0) next.lines = "Add at least one product";
    else if (lines.some((l) => num(l.qty) <= 0)) next.lines = "Every product needs a quantity above zero";
    if (num(amount) > t.total + 0.004) next.amount = `More than the purchase total (${USD.format(t.total)})`;
    else if (method === "Cash" && cashTotal(counts) > 0 && Math.abs(cashTotal(counts) - num(amount)) > 0.004)
      next.amount = `Cash counted (${USD.format(cashTotal(counts))}) doesn't match the amount`;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const purchase: Purchase = {
      id: Math.max(0, ...purchases.map((p) => p.id)) + 1,
      ref: ref.trim() || nextRef(purchases),
      date,
      location,
      supplierId: supplier!.id,
      status: status as PurchaseStatus,
      payTerm: payTermN ? `${payTermN} ${payTermUnit}` : null,
      lines: lines.map(asLine),
      discountType,
      discountAmount: num(discountAmount),
      tax: tax || null,
      shippingDetails: shippingDetails.trim(),
      shipping: num(shipping),
      expenses: expenses.filter((e) => e.name.trim() || num(e.amount)).map((e) => ({ name: e.name.trim(), amount: num(e.amount) })),
      notes: notes.trim(),
      payments: num(amount) > 0 ? [{ amount: num(amount), method, date: paidOn, note: paymentNote.trim() }] : [],
      addedBy: "Adnan Ahmed",
    };
    updatePurchases((prev) => [...prev, purchase]);
    // only goods actually received go into stock
    if (purchase.status === "Received")
      updateProducts((prev) => receiveStock(prev, purchase, supplier!.name, 1));
    router.push("/purchases");
  }

  return (
    <div className="flex flex-col gap-5">
      {Object.keys(errors).some((k) => errors[k as keyof Errors]) && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {Object.values(errors).filter(Boolean).join(" · ")}
        </div>
      )}

      {/* 1. purchase details */}
      <Section title="Purchase details">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>Supplier *</Label>
            <div className="flex gap-2">
              <Select
                value={supplierId}
                onChange={(v) => {
                  setSupplierId(v);
                  setErrors((prev) => ({ ...prev, supplier: undefined }));
                }}
                error={Boolean(errors.supplier)}
                icon="users"
              >
                <option value="">Please select</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.businessName ? ` (${s.businessName})` : ""}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                aria-label="Add a new supplier"
                title="Add a new supplier"
                onClick={() => setAddingSupplier(true)}
                className="shrink-0 rounded-lg border border-zinc-300 px-2.5 text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-brand-900"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
            {supplier ? (
              <p className="text-xs text-muted">
                {supplier.address}
                <br />
                {supplier.mobile}
              </p>
            ) : (
              <p className="text-xs text-muted">Address shows once a supplier is picked.</p>
            )}
          </div>

          <Input
            label="Reference no"
            placeholder={nextRef(purchases)}
            value={ref}
            onChange={(event) => setRef(event.target.value)}
            hint="Leave empty to autogenerate"
            className="font-mono"
          />

          <label className="flex flex-col gap-1.5">
            <Label>Purchase date *</Label>
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <Label>Purchase status *</Label>
            <Select
              value={status}
              onChange={(v) => {
                setStatus(v as PurchaseStatus);
                setErrors((prev) => ({ ...prev, status: undefined }));
              }}
              error={Boolean(errors.status)}
            >
              <option value="">Please select</option>
              {PURCHASE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <p className="text-xs text-muted">
              {status === "Received" ? "Stock goes up when you save." : "Stock changes once it's Received."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Business location *</Label>
            <Select value={location} onChange={setLocation} icon="store">
              {PRODUCT_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l} ({LOCATION_CODES[l]})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Pay term</Label>
            <div className="flex rounded-lg border border-zinc-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900">
              <input
                aria-label="Pay term"
                value={payTermN}
                onChange={(event) => setPayTermN(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Pay term"
                className="w-full min-w-0 rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none"
              />
              <select
                aria-label="Pay term unit"
                value={payTermUnit}
                onChange={(event) => setPayTermUnit(event.target.value)}
                className="rounded-r-lg border-l border-zinc-300 bg-transparent px-2 text-sm outline-none dark:border-navy-700"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <label className="flex flex-col gap-1.5 xl:col-span-2">
            <Label>Attach document</Label>
            <input
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
            />
            <span className="text-xs text-muted">Max 5 MB · .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png</span>
          </label>
        </div>
      </Section>

      {/* 2. products */}
      <Section
        title="Products"
        action={
          <div className="flex items-center gap-2">
            {/* importing a product list needs the backend */}
            <Button type="button" variant="secondary" size="sm" disabled title="Coming soon">
              <Icon name="download" className="h-4 w-4 rotate-180" />
              Import products
            </Button>
            <Link
              href="/products/create"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add new product
            </Link>
          </div>
        }
      >
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              // Enter (e.g. a barcode scanner) adds the first match
              if (event.key === "Enter" && matches[0]) {
                event.preventDefault();
                addLine(matches[0]);
              }
            }}
            placeholder="Enter product name / SKU / scan bar code"
            aria-label="Search products to add"
            className={cn(inputClass, "pl-9", errors.lines && "border-red-500")}
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

        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[1150px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                {["#", "Product name", "Purchase quantity", "Unit cost (before discount)", "Discount %", "Unit cost (before tax)", "Line total", "Profit margin %", "Unit selling price (inc. tax)", ""].map(
                  (h, i) => (
                    <th key={i} className={cn("whitespace-nowrap px-3 py-2.5 font-medium", [5, 6].includes(i) && "text-right")}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const line = asLine(l);
                return (
                  <tr key={l.key} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{l.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono">{l.sku}</span> · {l.stock.toFixed(2)} {l.unit} in stock
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex w-32 overflow-hidden rounded-lg border border-zinc-300 focus-within:border-brand-500 dark:border-navy-700">
                        <input
                          aria-label={`Quantity of ${l.name}`}
                          value={l.qty}
                          onChange={(event) => update(l.key, { qty: event.target.value.replace(/[^\d.]/g, "") })}
                          inputMode="decimal"
                          className="w-full min-w-0 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none dark:bg-navy-900"
                        />
                        <span className="border-l border-zinc-300 bg-surface px-2 py-1.5 text-xs text-muted dark:border-navy-700">{l.unit}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Money label={`Unit cost of ${l.name}`} value={l.unitCost} onChange={(v) => update(l.key, { unitCost: v })} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Discount percent for ${l.name}`}
                        value={l.discountPct}
                        onChange={(event) => update(l.key, { discountPct: event.target.value.replace(/[^\d.]/g, "") })}
                        inputMode="decimal"
                        className="w-20 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{USD.format(netUnitCost(line))}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{USD.format(lineTotal(line))}</td>
                    <td className="px-3 py-2">
                      {/* typing a margin sets the selling price, and the other way round */}
                      <input
                        aria-label={`Profit margin for ${l.name}`}
                        value={l.marginDraft ?? fixed(lineMargin(line))}
                        onChange={(event) => {
                          const text = event.target.value.replace(/[^\d.-]/g, "");
                          update(l.key, {
                            marginDraft: text,
                            sellingPrice: fixed(netUnitCost(line) * (1 + num(text) / 100)),
                          });
                        }}
                        onBlur={() => update(l.key, { marginDraft: undefined })}
                        inputMode="decimal"
                        className="w-24 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Money label={`Selling price of ${l.name}`} value={l.sellingPrice} onChange={(v) => update(l.key, { sellingPrice: v })} />
                    </td>
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
                  <td colSpan={10} className="px-3 py-8 text-center text-muted">
                    Search above to add the products you bought.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 ml-auto grid w-64 grid-cols-2 gap-y-1 text-[13px]">
          <dt className="text-muted">Total items:</dt>
          <dd className="text-right tabular-nums">{t.items.toFixed(2)}</dd>
          <dt className="font-medium">Net total amount:</dt>
          <dd className="text-right font-semibold tabular-nums">{USD.format(t.net)}</dd>
        </dl>
      </Section>

      {/* 3. discount, tax, notes */}
      <Section title="Discount & tax">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label>Discount type</Label>
            <Select value={discountType} onChange={(v) => setDiscountType(v as Purchase["discountType"])}>
              <option>None</option>
              <option>Fixed</option>
              <option>Percentage</option>
            </Select>
          </div>
          <label className="flex flex-col gap-1.5">
            <Label>Discount amount</Label>
            <input
              value={discountAmount}
              disabled={discountType === "None"}
              onChange={(event) => setDiscountAmount(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className={cn(inputClass, "disabled:bg-surface disabled:text-muted")}
            />
          </label>
          <p className="pb-2.5 text-[13px] text-muted">
            Discount: <span className="font-medium text-foreground">(−) {USD.format(t.discount)}</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <Label>Purchase tax</Label>
            <Select value={tax} onChange={setTax}>
              <option value="">None</option>
              {TAXES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>
          <span />
          <p className="pb-2.5 text-[13px] text-muted">
            Purchase tax: <span className="font-medium text-foreground">(+) {USD.format(t.tax)}</span>
          </p>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <Label>Additional notes</Label>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />
        </label>
      </Section>

      {/* 4. shipping and expenses */}
      <Section title="Shipping & expenses">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Shipping details" value={shippingDetails} onChange={(event) => setShippingDetails(event.target.value)} />
          <label className="flex flex-col gap-1.5">
            <Label>(+) Additional shipping charges</Label>
            <input
              value={shipping}
              onChange={(event) => setShipping(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setExpensesOpen((v) => !v);
              if (!expenses.length) setExpenses([{ key: Date.now(), name: "", amount: "" }]);
            }}
          >
            <Icon name="plus" className="h-4 w-4" />
            Add additional expenses
            <Icon name="chevron-down" className={cn("h-4 w-4 transition-transform", expensesOpen && "rotate-180")} />
          </Button>
          {expensesOpen && (
            <div className="flex w-full max-w-xl flex-col gap-2">
              {expenses.map((e, i) => (
                <div key={e.key} className="flex gap-2">
                  <input
                    aria-label={`Expense ${i + 1} name`}
                    placeholder="Expense name (e.g. Customs)"
                    value={e.name}
                    onChange={(event) =>
                      setExpenses((prev) => prev.map((x) => (x.key === e.key ? { ...x, name: event.target.value } : x)))
                    }
                    className={inputClass}
                  />
                  <input
                    aria-label={`Expense ${i + 1} amount`}
                    placeholder="0.00"
                    inputMode="decimal"
                    value={e.amount}
                    onChange={(event) =>
                      setExpenses((prev) =>
                        prev.map((x) => (x.key === e.key ? { ...x, amount: event.target.value.replace(/[^\d.]/g, "") } : x)),
                      )
                    }
                    className={cn(inputClass, "w-36")}
                  />
                  <button
                    type="button"
                    aria-label={`Remove expense ${i + 1}`}
                    onClick={() => setExpenses((prev) => prev.filter((x) => x.key !== e.key))}
                    className="rounded-lg px-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="self-start"
                onClick={() => setExpenses((prev) => [...prev, { key: Date.now(), name: "", amount: "" }])}
              >
                <Icon name="plus" className="h-4 w-4" />
                Add another expense
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-right text-[13px] text-muted">
          Purchase total: <span className="text-lg font-semibold tabular-nums text-foreground">{USD.format(t.total)}</span>
        </p>
      </Section>

      {/* 5. payment */}
      <Section title="Add payment">
        <p className="text-[13px] text-muted">
          Advance balance: <span className="font-medium text-foreground">{USD.format(0)}</span>
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <Label>Amount *</Label>
            <span className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
              <input
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                inputMode="decimal"
                className={cn(inputClass, "pl-7", errors.amount && "border-red-500")}
              />
            </span>
            <button
              type="button"
              onClick={() => setAmount(t.total.toFixed(2))}
              className="self-start text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Pay the full {USD.format(t.total)}
            </button>
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Paid on *</Label>
            <input type="datetime-local" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className={inputClass} />
          </label>
          <div className="flex flex-col gap-1.5">
            <Label>Payment method *</Label>
            <Select value={method} onChange={setMethod} icon="dollar">
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
        </div>

        {method === "Cash" && (
          <div className="mt-4">
            <CashDenominations counts={counts} onChange={setCounts} target={num(amount)} />
          </div>
        )}

        <label className="mt-4 flex flex-col gap-1.5">
          <Label>Payment note</Label>
          <textarea rows={2} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} className={inputClass} />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[13px] text-muted">
            Payment due:{" "}
            <span className={cn("text-lg font-semibold tabular-nums", t.due > 0 ? "text-rose-600" : "text-emerald-600")}>
              {USD.format(t.due)}
            </span>
          </p>
          <div className="flex gap-2">
            <Link href="/purchases" className="inline-flex items-center rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
              Cancel
            </Link>
            <Button type="button" variant="brand" onClick={save}>
              Save purchase
            </Button>
          </div>
        </div>
      </Section>

      {addingSupplier && (
        <SupplierDialog
          onClose={() => setAddingSupplier(false)}
          onSave={(values) => {
            const id = Math.max(0, ...suppliers.map((s) => s.id)) + 1;
            updateSuppliers((prev) => [...prev, { id, ...values }]);
            setSupplierId(String(id));
            setErrors((prev) => ({ ...prev, supplier: undefined }));
            setAddingSupplier(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{children}</span>;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} action={action} bodyClassName="border-t border-line pt-4">
      {children}
    </Card>
  );
}

function Select({
  value,
  onChange,
  children,
  icon,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  icon?: "users" | "store" | "dollar";
  error?: boolean;
}) {
  return (
    <span className="relative block w-full">
      {icon && (
        <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9", icon && "pl-10", error && "border-red-500")}
      >
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <span className="relative block w-32">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pl-6 pr-2.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900"
      />
    </span>
  );
}

/** "+" next to Supplier: a minimal new supplier (the Suppliers screen comes later). */
function SupplierDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (values: Omit<Supplier, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ name?: string; mobile?: string }>({});

  function save() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!mobile.trim()) next.mobile = "Mobile is required";
    setErrors(next);
    if (Object.keys(next).length === 0)
      onSave({ name: name.trim(), businessName: businessName.trim(), mobile: mobile.trim(), address: address.trim() });
  }

  return (
    <Modal
      title="Add a new supplier"
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input autoFocus label="Name *" value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
        <Input label="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        <Input
          label="Mobile *"
          type="tel"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          error={errors.mobile}
          leading={<Icon name="phone" className="h-4 w-4" />}
        />
        <Input label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
      </div>
    </Modal>
  );
}
