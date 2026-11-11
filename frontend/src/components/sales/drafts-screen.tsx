"use client";

/**
 * Sell -> List drafts and List quotations (`kind`), as in the old Opal POS:
 * location, customer, date range and user filters, then Date, Reference no,
 * Customer name, Contact number, Location, Total items, Added by and Action.
 *
 * Drafts and quotations never touch stock. "Convert to sale" turns one into a
 * Final sale (new invoice number, stock taken out) once there's enough stock.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import {
  applySale,
  lineSubtotal,
  nextInvoiceNo,
  saleTotals,
  updateSales,
  useSales,
  type HeldKind,
  type Sale,
} from "@/components/sales/sales-data";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { DEMO_USERS } from "@/components/users/users-data";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dash = <span className="text-muted">-</span>;
const fieldClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

type Filters = { location: string; customer: string; from: string; to: string; user: string };
const NO_FILTERS: Filters = { location: "", customer: "", from: "", to: "", user: "" };

/** Words and routes for each kind. */
const KIND = {
  Draft: { one: "draft", many: "drafts", title: "Drafts", base: "/drafts" },
  Quotation: { one: "quotation", many: "quotations", title: "Quotations", base: "/quotations" },
} as const;

export function DraftsScreen({ kind = "Draft" }: { kind?: HeldKind }) {
  const k = KIND[kind];
  const router = useRouter();
  const sales = useSales();
  const customers = useCustomers();
  const [products] = useDemoProducts();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const customerOf = (s: Sale) => customers.find((c) => c.id === s.customerId);
  const customerName = (s: Sale) => customerOf(s)?.name ?? "Unknown customer";
  const drafts = sales.filter((s) => s.status === kind);
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      sales.filter(
        (s) =>
          s.status === kind &&
          (!filters.location || s.location === filters.location) &&
          (!filters.customer || s.customerId === Number(filters.customer)) &&
          (!filters.from || s.date.slice(0, 10) >= filters.from) &&
          (!filters.to || s.date.slice(0, 10) <= filters.to) &&
          (!filters.user || s.addedBy === filters.user),
      ),
    [sales, filters, kind],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  /** Lines asking for more than is in stock right now. */
  function shortages(s: Sale) {
    return s.lines.flatMap((l) => {
      const p = products.find((x) => x.id === l.productId);
      if (!p || p.manageStock === false) return [];
      const stock = (p.variations.length ? p.variations.find((v) => v.sku === l.sku)?.stock : p.stock) ?? 0;
      return l.qty > stock ? [`${l.name} (${stock.toFixed(2)} in stock, ${l.qty.toFixed(2)} needed)`] : [];
    });
  }

  function convert(s: Sale) {
    const short = shortages(s);
    if (short.length) {
      setBlocked(`Not enough stock for: ${short.join(", ")}. Add stock or edit the ${k.one} first.`);
      return;
    }
    const finalSale: Sale = { ...s, status: "Final", invoiceNo: nextInvoiceNo(sales) };
    setConfirm({
      tone: "success",
      confirmLabel: "Convert",
      message: `${s.invoiceNo} becomes invoice ${finalSale.invoiceNo} for ${USD.format(saleTotals(s).total)} and its items come out of stock.`,
      onConfirm: () => {
        updateSales((prev) => prev.map((x) => (x.id === s.id ? finalSale : x)));
        updateProducts((prev) => applySale(prev, finalSale, customerName(s), 1));
        router.push("/sales");
      },
    });
  }

  const columns: DataColumn<Sale>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (s) => s.date,
      text: (s) => `${day(s.date)} ${time(s.date)}`,
      render: (s) => (
        <span className="leading-tight">
          <span className="block">{day(s.date)}</span>
          <span className="block text-xs text-muted">{time(s.date)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (s) => s.invoiceNo,
      text: (s) => s.invoiceNo,
      render: (s) => (
        <button type="button" onClick={() => setViewing(s)} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {s.invoiceNo}
        </button>
      ),
    },
    {
      key: "customer",
      label: "Customer name",
      sortValue: customerName,
      text: customerName,
      render: (s) => <span className="font-medium">{customerName(s)}</span>,
    },
    {
      key: "contact",
      label: "Contact number",
      sortValue: (s) => customerOf(s)?.mobile ?? "",
      text: (s) => customerOf(s)?.mobile ?? "",
      render: (s) => customerOf(s)?.mobile ?? dash,
    },
    { key: "location", label: "Location", sortValue: (s) => s.location, text: (s) => s.location },
    {
      key: "items",
      label: "Total items",
      sortValue: (s) => saleTotals(s).items,
      text: (s) => saleTotals(s).items.toFixed(2),
      align: "right",
    },
    { key: "addedBy", label: "Added by", sortValue: (s) => s.addedBy, text: (s) => s.addedBy },
  ];

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
          <FilterSelect label="Business location" value={filters.location} onChange={(v) => set("location", v)} options={[{ value: "", label: "All" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]} />
          <FilterSelect label="Customer" value={filters.customer} onChange={(v) => set("customer", v)} options={[{ value: "", label: "All" }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")} />
              <span className="text-xs text-muted">to</span>
              <input type="date" aria-label="To date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")} />
            </div>
          </div>
          <FilterSelect label="User" value={filters.user} onChange={(v) => set("user", v)} options={[{ value: "", label: "All" }, ...DEMO_USERS.map((u) => ({ value: u.name, label: u.name }))]} />
        </div>
      </Card>

      <DataTable
        title={k.title}
        subtitle={active > 0 ? `${rows.length} of ${drafts.length} ${k.many} match the filters` : `${drafts.length} ${k.many}`}
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun={k.many}
        exportName={k.many}
        minWidth={1000}
        headerAction={
          <Link
            href={`${k.base}/create`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add {k.one}
          </Link>
        }
        actions={(s) => (
          <ActionsMenu
            label={`Actions for ${s.invoiceNo}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing(s) },
              { label: "Edit", icon: "pencil", href: `${k.base}/${s.id}/edit` },
              { label: "Convert to sale", icon: "receipt", onClick: () => convert(s) },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `${kind} ${s.invoiceNo} will be deleted.`,
                    onConfirm: () => updateSales((prev) => prev.filter((x) => x.id !== s.id)),
                  }),
              },
            ]}
          />
        )}
      />

      {viewing && (
        <Modal
          title={`${kind} details (Reference no: ${viewing.invoiceNo})`}
          description={`${customerName(viewing)} · ${viewing.location} · ${day(viewing.date)} ${time(viewing.date)}`}
          onClose={() => setViewing(null)}
          className="max-w-2xl"
          footer={
            <>
              <Link
                href={`${k.base}/${viewing.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface"
              >
                <Icon name="pencil" className="h-4 w-4" />
                Edit
              </Link>
              <Button type="button" variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
            </>
          }
        >
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Unit price</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {viewing.lines.map((l) => (
                  <tr key={l.sku} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(lineSubtotal(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-right text-[13px] text-muted">
            Total payable: <span className="text-base font-semibold tabular-nums text-foreground">{USD.format(saleTotals(viewing).total)}</span>
          </p>
          {viewing.sellNote && (
            <p className="mt-2 text-[13px]">
              <span className="text-muted">Sell note:</span> {viewing.sellNote}
            </p>
          )}
        </Modal>
      )}

      {blocked && (
        <Modal
          title={`Can't convert this ${k.one}`}
          onClose={() => setBlocked(null)}
          className="max-w-md"
          footer={
            <Button type="button" variant="secondary" onClick={() => setBlocked(null)}>
              OK
            </Button>
          }
        >
          <p className="text-[13px] text-muted">{blocked}</p>
        </Modal>
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
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, "appearance-none px-3 pr-9", value ? "border-brand-500/60" : "border-line")}
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
