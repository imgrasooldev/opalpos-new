"use client";

/**
 * Product stock history, as in the old Opal POS: pick the product, business
 * location and variation; see quantities in / out, the current stock, and
 * every movement with its running quantity.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { LOCATION_CODES } from "@/components/inventory/products-data";
import { historyFor, stockUnits, summarize, type HistoryRow } from "@/components/inventory/stock-history";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const NUMBER = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const when = (iso: string) => DATE_TIME.format(new Date(iso));
const dash = <span className="text-muted">—</span>;

export function StockHistoryScreen({ id }: { id: number }) {
  const hydrated = useHydrated();
  const [products] = useDemoProducts();
  const product = products.find((p) => p.id === id);

  // products added in this tab only exist in the browser
  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!product)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          This product doesn&apos;t exist.{" "}
          <Link href="/products" className="font-medium text-brand-500 hover:text-brand-600">
            Back to products
          </Link>
        </p>
      </Card>
    );
  return <History key={product.id} productId={product.id} />;
}

function History({ productId }: { productId: number }) {
  const router = useRouter();
  const [products] = useDemoProducts();
  const product = products.find((p) => p.id === productId)!;
  const units = stockUnits(product);

  const [sku, setSku] = useState(units[0].sku);
  const [location, setLocation] = useState("");
  const unit = units.find((u) => u.sku === sku) ?? units[0];

  // running quantity is per location when one is picked
  const all = historyFor(product, unit.sku);
  const filtered = location ? all.filter((r) => r.location === location) : all;
  const rows = filtered.reduce<HistoryRow[]>(
    (acc, r) => [...acc, { ...r, newQty: (acc.at(-1)?.newQty ?? 0) + r.qty }],
    [],
  );
  const s = summarize(rows);
  const u = product.unit;

  const columns: DataColumn<HistoryRow>[] = [
    { key: "type", label: "Type", sortValue: (r) => r.type, text: (r) => r.type },
    {
      key: "qty",
      label: "Quantity change",
      sortValue: (r) => r.qty,
      text: (r) => `${r.qty > 0 ? "+" : ""}${NUMBER.format(r.qty)}`,
      render: (r) => (
        <span className={cn("font-medium", r.qty > 0 ? "text-emerald-600" : "text-rose-600")}>
          {r.qty > 0 ? "+" : ""}
          {NUMBER.format(r.qty)}
        </span>
      ),
      align: "right",
    },
    {
      key: "newQty",
      label: "New quantity",
      sortValue: (r) => r.newQty,
      text: (r) => NUMBER.format(r.newQty),
      align: "right",
    },
    {
      key: "date",
      label: "Date",
      sortValue: (r) => r.date,
      text: (r) => when(r.date),
      render: (r) => <span className="text-muted">{when(r.date)}</span>,
    },
    {
      key: "location",
      label: "Location",
      sortValue: (r) => r.location ?? "",
      text: (r) => r.location ?? "",
      render: (r) => r.location ?? dash,
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (r) => r.ref ?? "",
      text: (r) => r.ref ?? "",
      render: (r) => (r.ref ? <span className="font-mono text-xs">{r.ref}</span> : dash),
    },
    {
      key: "party",
      label: "Customer / supplier",
      sortValue: (r) => r.party ?? "",
      text: (r) => r.party ?? "",
      render: (r) => r.party ?? dash,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={<h2 className="text-sm font-semibold">{product.name}</h2>}
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <Picker
            label="Product"
            value={String(product.id)}
            onChange={(v) => router.push(`/products/${v}/stock-history`)}
            options={products.map((p) => ({ value: String(p.id), label: `${p.name} - ${p.sku}` }))}
          />
          <Picker
            label="Business location"
            value={location}
            onChange={setLocation}
            options={[
              { value: "", label: "All locations" },
              ...product.locations.map((l) => ({ value: l, label: `${l} (${LOCATION_CODES[l]})` })),
            ]}
          />
          <Picker
            label="Variations"
            value={unit.sku}
            onChange={setSku}
            disabled={units.length === 1}
            options={units.map((x) => ({ value: x.sku, label: `${x.label} (${x.sku})` }))}
          />
        </div>
      </Card>

      <Card
        title={
          <h2 className="text-sm font-semibold">
            {unit.label} <span className="font-mono text-xs font-normal text-muted">({unit.sku})</span>
            {location && <span className="ml-2 text-xs font-normal text-muted">at {location}</span>}
          </h2>
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Summary
            title="Quantities in"
            tone="in"
            rows={[
              ["Total purchase", s.totalPurchase],
              ["Opening / add stock", s.openingAdd],
              ["Total sell return", s.sellReturn],
              ["Stock transfers (in)", s.transfersIn],
            ]}
            unit={u}
          />
          <Summary
            title="Quantities out"
            tone="out"
            rows={[
              ["Total sold", s.sold],
              ["Total stock adjustment", s.adjustment],
              ["Total purchase return", s.purchaseReturn],
              ["Stock transfers (out)", s.transfersOut],
            ]}
            unit={u}
          />
          <div className="rounded-xl border border-brand-500/30 bg-brand-50/50 p-4 dark:bg-brand-900/20">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Totals</p>
            <p className="mt-3 text-[13px] text-muted">Current stock</p>
            <p className={cn("text-2xl font-semibold tabular-nums", s.current <= 0 && "text-rose-600")}>
              {NUMBER.format(s.current)} <span className="text-sm font-normal text-muted">{u}</span>
            </p>
          </div>
        </div>
      </Card>

      <DataTable
        key={`${unit.sku}-${location}`}
        title="Stock movements"
        subtitle="Every change to this stock, with the quantity after it"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="movements"
        exportName={`stock-history-${unit.sku}`}
      />
    </div>
  );
}

function Summary({
  title,
  tone,
  rows,
  unit,
}: {
  title: string;
  tone: "in" | "out";
  rows: [string, number][];
  unit: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon
          name={tone === "in" ? "trend-up" : "trend-down"}
          className={cn("h-4 w-4", tone === "in" ? "text-emerald-600" : "text-rose-600")}
        />
        {title}
      </p>
      <dl className="mt-2 divide-y divide-line text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="font-medium">{label}</dt>
            <dd className={cn("tabular-nums", value === 0 && "text-muted")}>
              {NUMBER.format(value)} {unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-line bg-background px-3 py-2 pr-9 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface disabled:text-muted"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}
