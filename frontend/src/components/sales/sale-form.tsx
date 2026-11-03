"use client";

/**
 * Add sale — same sections and order as the old Opal POS form:
 *
 *   1. location (top), customer with "+", billing / shipping address, pay
 *      term, sale date, status, invoice scheme, invoice no, document
 *   2. products: search by name / SKU, quantity, unit price, discount
 *   3. discount, Opal Points, order tax, sell note
 *   4. shipping, additional expenses, total payable
 *   5. payment, change return and balance; Save or Save and print
 *
 * A Final sale takes its quantities out of stock and can't sell more than is
 * in stock. Drafts, quotations and proformas are kept without touching stock
 * or taking payment.
 *
 * `mode="Draft"` / `mode="Quotation"` are Sell -> Add draft / Add quotation:
 * the same form without the status and payment, saved with that status. With
 * `initial` it edits that draft or quotation in place.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { CustomerDialog } from "@/components/contacts/customer-dialog";
import { nextContactId, updateCustomers, useCustomers } from "@/components/contacts/customer-store";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { LOCATION_CODES, PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import { nowLocal } from "@/components/purchases/payment-dialog";
import { bestDiscount, useDiscounts } from "@/components/sales/discounts-data";
import {
  POINT_VALUE,
  SALE_PAYMENT_METHODS,
  SALE_STATUSES,
  SHIPPING_STATUSES,
  applySale,
  lineSubtotal,
  nextHeldRef,
  nextInvoiceNo,
  saleTotals,
  updateSales,
  useSales,
  type HeldKind,
  type Sale,
  type SaleLine,
  type SaleStatus,
} from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const decimal = (v: string) => v.replace(/[^\d.]/g, "");

type Draft = {
  key: string;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  /** null when the product doesn't track stock. */
  stock: number | null;
  qty: string;
  unitPrice: string;
  discountType: SaleLine["discountType"];
  discount: string;
  /** Name of the automatic discount applied when the line was added. */
  discountName?: string;
};

const asLine = (d: Draft): SaleLine => ({
  productId: d.productId,
  sku: d.sku,
  name: d.name,
  qty: num(d.qty),
  unitPrice: num(d.unitPrice),
  discountType: d.discountType,
  discount: num(d.discount),
});

export function SaleForm({ mode = "Sale", initial }: { mode?: "Sale" | HeldKind; initial?: Sale }) {
  const router = useRouter();
  const [products] = useDemoProducts();
  const customers = useCustomers();
  const sales = useSales();
  const discounts = useDiscounts();
  // drafts and quotations are "held": no status picker, no payment, no stock
  const held = mode !== "Sale" ? mode : null;
  const [term, unit] = initial?.payTerm?.split(" ") ?? [];

  const [location, setLocation] = useState(initial?.location ?? PRODUCT_LOCATIONS[0]);
  const [customerId, setCustomerId] = useState(String(initial?.customerId ?? 1));
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [payTermN, setPayTermN] = useState(term ?? "");
  const [payTermUnit, setPayTermUnit] = useState(unit ?? "");
  const [date, setDate] = useState(() => initial?.date ?? nowLocal());
  const [status, setStatus] = useState<SaleStatus | "">(held ?? "");
  const [invoiceScheme, setInvoiceScheme] = useState(initial?.invoiceScheme ?? "Default");
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo ?? "");

  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Draft[]>(() =>
    (initial?.lines ?? []).map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const stock = p?.variations.length ? p.variations.find((v) => v.sku === l.sku)?.stock : p?.stock;
      return {
        key: l.sku,
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        unit: p?.unit ?? "Pcs",
        stock: p?.manageStock === false ? null : (stock ?? 0),
        qty: String(l.qty),
        unitPrice: l.unitPrice.toFixed(2),
        discountType: l.discountType,
        discount: l.discount.toFixed(2),
      };
    }),
  );

  const [discountType, setDiscountType] = useState<Sale["discountType"]>(initial?.discountType ?? "Percentage");
  const [discountAmount, setDiscountAmount] = useState((initial?.discountAmount ?? 0).toFixed(2));
  const [points, setPoints] = useState(initial?.pointsRedeemed ? String(initial.pointsRedeemed) : "");
  const [orderTax, setOrderTax] = useState(initial?.orderTax ?? "");
  const [sellNote, setSellNote] = useState(initial?.sellNote ?? "");

  const [shippingDetails, setShippingDetails] = useState(initial?.shippingDetails ?? "");
  const [shippingAddress, setShippingAddress] = useState(initial?.shippingAddress ?? "");
  const [shippingCharges, setShippingCharges] = useState((initial?.shippingCharges ?? 0).toFixed(2));
  const [shippingStatus, setShippingStatus] = useState<string>(initial?.shippingStatus ?? "");
  const [deliveredTo, setDeliveredTo] = useState(initial?.deliveredTo ?? "");
  const [expensesOpen, setExpensesOpen] = useState(Boolean(initial?.expenses.length));
  const [expenses, setExpenses] = useState<{ key: number; name: string; amount: string }[]>(
    () => (initial?.expenses ?? []).map((e, i) => ({ key: i, name: e.name, amount: String(e.amount) })),
  );

  const [amount, setAmount] = useState("0.00");
  const [paidOn, setPaidOn] = useState(nowLocal);
  const [method, setMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");

  const [errors, setErrors] = useState<string[]>([]);

  const customer = customers.find((c) => c.id === Number(customerId));
  const isFinal = status === "Final" || status === "";
  const available = customer?.opalPoints ?? 0;
  const t = saleTotals({
    lines: lines.map(asLine),
    discountType,
    discountAmount: num(discountAmount),
    pointsRedeemed: Math.min(num(points), available),
    orderTax: orderTax || null,
    shippingCharges: num(shippingCharges),
    expenses: expenses.map((e) => ({ name: e.name, amount: num(e.amount) })),
    payments: [{ amount: num(amount), method, date: paidOn, note: "" }],
  });
  const change = Math.max(0, t.paid - t.total);
  const balance = Math.max(0, t.due);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.active && !p.notForSelling && p.locations.includes(location))
      .flatMap((p) =>
        (p.variations.length
          ? p.variations.map((v) => ({
              p,
              sku: v.sku,
              name: `${p.name} - ${v.name}`,
              stock: v.stock,
              price: v.sellingPrice ?? p.sellingPrice,
            }))
          : [{ p, sku: p.sku, name: p.name, stock: p.stock, price: p.sellingPrice }]
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
              key: m.sku,
              productId: m.p.id,
              sku: m.sku,
              name: m.name,
              unit: m.p.unit,
              stock: m.p.manageStock === false ? null : m.stock,
              qty: "1",
              unitPrice: m.price.toFixed(2),
              // the best active discount for this product, location and sale date
              ...(() => {
                const d = bestDiscount(discounts, m.p, location, date);
                return d
                  ? { discountType: d.type, discount: d.amount.toFixed(2), discountName: d.name }
                  : { discountType: "Fixed" as const, discount: "0.00" };
              })(),
            },
          ],
    );
    setSearch("");
  }

  function update(key: string, patch: Partial<Draft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function save(print: boolean) {
    const next: string[] = [];
    if (!customer) next.push("Pick a customer");
    if (!status) next.push("Pick a status");
    if (lines.length === 0) next.push("Add at least one product");
    for (const l of lines) {
      if (num(l.qty) <= 0) next.push(`${l.name}: quantity must be above zero`);
      else if (status === "Final" && l.stock !== null && num(l.qty) > l.stock)
        next.push(`${l.name}: only ${l.stock.toFixed(2)} ${l.unit} in stock`);
    }
    if (num(points) > available) next.push(`Only ${available} Opal Points available`);
    if (invoiceNo.trim() && sales.some((s) => s.id !== initial?.id && s.invoiceNo === invoiceNo.trim()))
      next.push(`Invoice no ${invoiceNo.trim()} is already used`);
    setErrors(next);
    if (next.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const id = initial?.id ?? Math.max(0, ...sales.map((s) => s.id)) + 1;
    // what the customer handed over beyond the total comes back as change
    const kept = Math.min(num(amount), t.total);
    const sale: Sale = {
      id,
      invoiceNo: invoiceNo.trim() || (held ? nextHeldRef(sales, held) : nextInvoiceNo(sales)),
      date,
      location,
      customerId: customer!.id,
      status: status as SaleStatus,
      // a blank pay term falls back to the customer's own
      payTerm: payTermN && payTermUnit ? `${payTermN} ${payTermUnit}` : customer!.payTerm,
      invoiceScheme,
      lines: lines.map(asLine),
      discountType,
      discountAmount: num(discountAmount),
      pointsRedeemed: Math.min(num(points), available),
      orderTax: orderTax || null,
      sellNote: sellNote.trim(),
      staffNote: initial?.staffNote ?? "",
      shippingDetails: shippingDetails.trim(),
      shippingAddress: shippingAddress.trim(),
      shippingCharges: num(shippingCharges),
      shippingStatus: (shippingStatus || null) as Sale["shippingStatus"],
      deliveredTo: deliveredTo.trim(),
      expenses: expenses.filter((e) => e.name.trim() || num(e.amount)).map((e) => ({ name: e.name.trim(), amount: num(e.amount) })),
      payments: status === "Final" && kept > 0 ? [{ amount: kept, method, date: paidOn, note: paymentNote.trim() }] : [],
      addedBy: initial?.addedBy ?? "Adnan Ahmed",
      source: "Sale",
    };
    updateSales((prev) => (initial ? prev.map((s) => (s.id === id ? sale : s)) : [...prev, sale]));
    if (sale.status === "Final") {
      updateProducts((prev) => applySale(prev, sale, customer!.name, 1));
      if (sale.pointsRedeemed)
        updateCustomers((prev) =>
          prev.map((c) => (c.id === customer!.id ? { ...c, opalPoints: c.opalPoints - sale.pointsRedeemed } : c)),
        );
    }
    router.push(held ? (held === "Draft" ? "/drafts" : "/quotations") : print ? `/sales?print=${id}` : "/sales");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* location sits above the form, like the old screen */}
      <div className="flex max-w-sm items-center gap-2">
        <Select value={location} onChange={(v) => {
          setLocation(v);
          setLines([]);
        }} icon="store" label="Business location">
          {PRODUCT_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l} ({LOCATION_CODES[l]})
            </option>
          ))}
        </Select>
        <span title="Products are listed for this location. Changing it clears the products." className="text-brand-500">
          <Icon name="alert" className="h-4 w-4" />
        </span>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {errors.join(" · ")}
        </div>
      )}

      {/* 1. sale details */}
      <Card bodyClassName="pt-5">
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col gap-1.5">
            <Label>Customer *</Label>
            <div className="flex gap-2">
              <Select value={customerId} onChange={setCustomerId} icon="users" label="Customer">
                <option value="">Please select</option>
                {customers
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.businessName ? ` (${c.businessName})` : ""}
                      {c.mobile ? ` · ${c.mobile}` : ""}
                    </option>
                  ))}
              </Select>
              <button
                type="button"
                aria-label="Add a new customer"
                title="Add a new customer"
                onClick={() => setAddingCustomer(true)}
                className="shrink-0 rounded-lg border border-zinc-300 px-2.5 text-brand-500 transition-colors hover:border-brand-500 hover:bg-brand-50 dark:border-navy-700 dark:hover:bg-brand-900"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
            {customer && (
              <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">Billing address</p>
                  <p className="text-muted">
                    {customer.businessName ?? customer.name}
                    {customer.address && <>, {customer.address}</>}
                    {customer.mobile && <><br />{customer.mobile}</>}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">Shipping address</p>
                  <p className="text-muted">
                    {customer.name}
                    {customer.address && <>, {customer.address}</>}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Pay term</Label>
              <div className="flex rounded-lg border border-zinc-300 bg-white focus-within:border-brand-500 dark:border-navy-700 dark:bg-navy-900">
                <input
                  aria-label="Pay term"
                  value={payTermN}
                  onChange={(event) => setPayTermN(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder={customer?.payTerm ?? "Pay term"}
                  className="w-full min-w-0 rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none"
                />
                <select
                  aria-label="Pay term unit"
                  value={payTermUnit}
                  onChange={(event) => setPayTermUnit(event.target.value)}
                  className="rounded-r-lg border-l border-zinc-300 bg-transparent px-2 text-sm outline-none dark:border-navy-700"
                >
                  <option value="">Please select</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <Label>Sale date *</Label>
              <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
            </label>
            {!held && (
              <div className="flex flex-col gap-1.5">
                <Label>Status *</Label>
                <Select value={status} onChange={(v) => setStatus(v as SaleStatus)} label="Status">
                  <option value="">Please select</option>
                  {SALE_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                {status && status !== "Final" && (
                  <p className="text-xs text-muted">Saved without moving stock or taking payment.</p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Invoice scheme</Label>
              <Select value={invoiceScheme} onChange={setInvoiceScheme} label="Invoice scheme">
                <option>Default</option>
              </Select>
            </div>
            <label className="flex flex-col gap-1.5">
              <Label>Invoice no</Label>
              <input
                value={invoiceNo}
                onChange={(event) => setInvoiceNo(event.target.value)}
                placeholder={held ? nextHeldRef(sales, held) : nextInvoiceNo(sales)}
                className={cn(inputClass, "font-mono")}
              />
              <span className="text-xs text-muted">Keep blank to auto generate</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <Label>Attach document</Label>
              <input
                type="file"
                accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
                className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
              />
              <span className="text-xs text-muted">Max 5 MB · .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png</span>
            </label>
          </div>
        </div>
      </Card>

      {/* 2. products */}
      <Card bodyClassName="pt-5">
        <div className="relative mx-auto max-w-4xl">
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
            placeholder="Enter product name / SKU / scan bar code"
            aria-label="Search products to sell"
            className={cn(inputClass, "pl-9")}
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
                      <span>{USD.format(m.price)}</span>
                      <span>{m.p.manageStock === false ? "No stock tracking" : `${m.stock.toFixed(2)} in stock`}</span>
                      <span className="font-mono">{m.sku}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Quantity</th>
                <th className="px-3 py-2.5 font-medium">Unit price</th>
                <th className="px-3 py-2.5 font-medium">Discount</th>
                <th className="px-3 py-2.5 text-right font-medium">Subtotal</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const over = status !== "" && status === "Final" && l.stock !== null && num(l.qty) > l.stock;
                return (
                  <tr key={l.key} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{l.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono">{l.sku}</span>
                        {l.stock !== null && <> · {l.stock.toFixed(2)} {l.unit} in stock</>}
                      </p>
                      {l.discountName && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Icon name="tag" className="h-3 w-3" />
                          {l.discountName}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("flex w-36 overflow-hidden rounded-lg border focus-within:border-brand-500", over ? "border-red-500" : "border-zinc-300 dark:border-navy-700")}>
                        <input
                          aria-label={`Quantity of ${l.name}`}
                          value={l.qty}
                          onChange={(event) => update(l.key, { qty: decimal(event.target.value) })}
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
                          onChange={(event) => update(l.key, { unitPrice: decimal(event.target.value) })}
                          inputMode="decimal"
                          className={cn(smallInput, "w-full pl-6")}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex gap-1.5">
                        <input
                          aria-label={`Discount on ${l.name}`}
                          value={l.discount}
                          onChange={(event) => update(l.key, { discount: decimal(event.target.value) })}
                          inputMode="decimal"
                          className={cn(smallInput, "w-24")}
                        />
                        <select
                          aria-label={`Discount type for ${l.name}`}
                          value={l.discountType}
                          onChange={(event) => update(l.key, { discountType: event.target.value as SaleLine["discountType"] })}
                          className={cn(smallInput, "w-32")}
                        >
                          <option>Fixed</option>
                          <option>Percentage</option>
                        </select>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{USD.format(lineSubtotal(asLine(l)))}</td>
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
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    Search above to add products to this sale.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface text-[13px]">
                <td colSpan={6} className="px-3 py-2.5 text-right">
                  <span className="text-muted">Items:</span> <b className="tabular-nums">{t.items.toFixed(2)}</b>
                  <span className="ml-6 text-muted">Total:</span> <b className="tabular-nums">{USD.format(t.subtotal)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* 3. discount, points, tax, note */}
      <Card bodyClassName="pt-5">
        <div className="grid items-end gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Discount type *</Label>
            <Select value={discountType} onChange={(v) => setDiscountType(v as Sale["discountType"])} label="Discount type">
              <option>None</option>
              <option>Fixed</option>
              <option>Percentage</option>
            </Select>
          </div>
          <label className="flex flex-col gap-1.5">
            <Label>Discount amount *</Label>
            <input
              value={discountAmount}
              disabled={discountType === "None"}
              onChange={(event) => setDiscountAmount(decimal(event.target.value))}
              inputMode="decimal"
              className={cn(inputClass, "disabled:bg-surface disabled:text-muted")}
            />
          </label>
          <Sum label="Discount amount" sign="−" value={t.discount} />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold">Opal Points</p>
          <div className="mt-3 grid items-end gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <Label>Redeemed</Label>
              <input
                value={points}
                disabled={available <= 0}
                onChange={(event) => setPoints(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder={available > 0 ? `Up to ${available}` : "No points to redeem"}
                className={cn(inputClass, "disabled:bg-background disabled:text-muted", num(points) > available && "border-red-500")}
              />
            </label>
            <p className="pb-2.5 text-[13px] text-muted">
              Available: <span className="font-medium text-foreground">{available}</span>
              <span className="ml-1 text-xs">(1 point = {USD.format(POINT_VALUE)})</span>
            </p>
            <Sum label="Redeemed amount" sign="−" value={t.points} />
          </div>
        </div>

        <div className="mt-5 grid items-end gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Order tax *</Label>
            <Select value={orderTax} onChange={setOrderTax} label="Order tax">
              <option value="">None</option>
              {TAXES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>
          <span />
          <Sum label="Order tax" sign="+" value={t.tax} />
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <Label>Sell note</Label>
          <textarea rows={3} value={sellNote} onChange={(event) => setSellNote(event.target.value)} className={inputClass} />
        </label>
      </Card>

      {/* 4. shipping */}
      <Card bodyClassName="pt-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <Label>Shipping details</Label>
            <textarea rows={3} value={shippingDetails} onChange={(event) => setShippingDetails(event.target.value)} placeholder="Shipping details" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Shipping address</Label>
            <textarea rows={3} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} placeholder={customer?.address ?? "Shipping address"} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Shipping charges</Label>
            <input value={shippingCharges} onChange={(event) => setShippingCharges(decimal(event.target.value))} inputMode="decimal" className={inputClass} />
          </label>
          <div className="flex flex-col gap-1.5">
            <Label>Shipping status</Label>
            <Select value={shippingStatus} onChange={setShippingStatus} label="Shipping status">
              <option value="">Please select</option>
              {SHIPPING_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <label className="flex flex-col gap-1.5">
            <Label>Delivered to</Label>
            <input value={deliveredTo} onChange={(event) => setDeliveredTo(event.target.value)} placeholder="Delivered to" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Shipping documents</Label>
            <input
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
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
                    placeholder="Expense name"
                    value={e.name}
                    onChange={(event) => setExpenses((prev) => prev.map((x) => (x.key === e.key ? { ...x, name: event.target.value } : x)))}
                    className={inputClass}
                  />
                  <input
                    aria-label={`Expense ${i + 1} amount`}
                    placeholder="0.00"
                    inputMode="decimal"
                    value={e.amount}
                    onChange={(event) => setExpenses((prev) => prev.map((x) => (x.key === e.key ? { ...x, amount: decimal(event.target.value) } : x)))}
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
          Total payable: <span className="text-lg font-semibold tabular-nums text-foreground">{USD.format(t.total)}</span>
        </p>
      </Card>

      {/* 5. payment (drafts and quotations take none) */}
      {!held && (
        <Card title="Add payment" bodyClassName="border-t border-line pt-4">
          {!isFinal ? (
            <p className="text-[13px] text-muted">Payments are taken on Final sales only.</p>
          ) : (
            <>
              <p className="text-[13px] text-muted">
                Advance balance: <span className="font-medium text-foreground">{USD.format(customer?.advanceBalance ?? 0)}</span>
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <Label>Amount *</Label>
                  <span className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                    <input
                      value={amount}
                      onChange={(event) => setAmount(decimal(event.target.value))}
                      inputMode="decimal"
                      className={cn(inputClass, "pl-7")}
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
                  <Select value={method} onChange={setMethod} icon="dollar" label="Payment method">
                    {SALE_PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="mt-4 flex flex-col gap-1.5">
                <Label>Payment note</Label>
                <textarea rows={2} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} className={inputClass} />
              </label>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-y border-line py-4">
                <div>
                  <p className="text-[13px] font-medium">Change return:</p>
                  <p className="text-xl font-semibold tabular-nums">{USD.format(change)}</p>
                </div>
                <p className="text-[13px] text-muted">
                  Balance:{" "}
                  <span className={cn("font-semibold tabular-nums", balance > 0 ? "text-rose-600" : "text-foreground")}>
                    {USD.format(balance)}
                  </span>
                </p>
              </div>
            </>
          )}
        </Card>
      )}

      <div className="flex justify-center gap-2">
        <Button type="button" variant="brand" onClick={() => save(false)}>
          {initial ? "Update" : "Save"}
        </Button>
        {!held && (
          <button
            type="button"
            onClick={() => save(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Icon name="printer" className="h-4 w-4" />
            Save and print
          </button>
        )}
      </div>

      {addingCustomer && (
        <CustomerDialog
          onClose={() => setAddingCustomer(false)}
          onSave={(c) => {
            const id = Math.max(0, ...customers.map((x) => x.id)) + 1;
            updateCustomers((prev) => [...prev, { ...c, id, contactId: c.contactId || nextContactId(prev) }]);
            setCustomerId(String(id));
            setAddingCustomer(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- pieces ----------

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900";
const smallInput =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{children}</span>;
}

function Sum({ label, sign, value }: { label: string; sign: "+" | "−"; value: number }) {
  return (
    <p className="pb-2.5 text-[13px] text-muted">
      {label}: <span className="font-medium text-foreground">({sign}) {USD.format(value)}</span>
    </p>
  );
}

function Select({
  value,
  onChange,
  children,
  icon,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  icon?: "users" | "store" | "dollar";
  label: string;
}) {
  return (
    <span className="relative block w-full">
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9", icon && "pl-10")}
      >
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
