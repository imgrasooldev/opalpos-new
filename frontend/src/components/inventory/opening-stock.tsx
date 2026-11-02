"use client";

/**
 * "Update & Edit Quantity" (opening stock), as in the old Opal POS: one table
 * per business location, a row per product (or per variation) with quantity,
 * unit cost, subtotal, date and note, and the total amount.
 *
 * Saving sets the product's stock to the quantities entered (summed across
 * locations). For a product that already has stock, the current stock is
 * prefilled in its first location, so saving without edits keeps it.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateProducts, useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";
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
import { Icon } from "@/components/ui/icon";

export function OpeningStock({ id }: { id: number }) {
  const hydrated = useHydrated();
  const [products] = useDemoProducts();
  const product = products.find((p) => p.id === id);

  // products added in this tab only exist in the browser — wait before saying "not found"
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
  if (product.locations.length === 0)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          <span className="font-medium text-foreground">{product.name}</span> isn&apos;t in any business
          location yet, so there&apos;s nowhere to put stock. Add it to a location from the products list
          first.
        </p>
        <Link href="/products" className={buttonStyles({ variant: "secondary", className: "mt-4" })}>
          Back to products
        </Link>
      </Card>
    );

  return <OpeningStockForm key={product.id} product={product} />;
}

function OpeningStockForm({ product }: { product: DemoProduct }) {
  const router = useRouter();
  const rows = stockRows(product);
  const [lines, setLines] = useState(() =>
    initialStockLines(product.locations, rows, product.purchasePrice),
  );
  const [now] = useState(() => new Date());
  const total = stockTotal(lines, product.locations, rows, product.purchasePrice);

  function save() {
    // stock per row, summed across locations
    const qty = (key: string) => quantityOf(lines, product.locations, key);
    updateProducts((prev) =>
      prev.map((p) => {
        if (p.id !== product.id) return p;
        const next = p.variations.length
          ? {
              ...p,
              variations: p.variations.map((v, i) => ({ ...v, stock: qty(String(i)) })),
              stock: p.variations.reduce((t, _, i) => t + qty(String(i)), 0),
            }
          : { ...p, stock: qty("single") };
        // history: the difference from before, at the first location
        const changes = p.variations.length
          ? p.variations.map((v, i) => ({ sku: v.sku, qty: qty(String(i)) - v.stock, location: p.locations[0] ?? null }))
          : [{ sku: p.sku, qty: qty("single") - p.stock, location: p.locations[0] ?? null }];
        return logStock(next, changes);
      }),
    );
    router.push("/products");
  }

  const saveButton = (
    <Button type="button" variant="brand" onClick={save}>
      Save
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-muted">
            <Icon name="cube" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">{product.name}</p>
            <p className="font-mono text-xs text-muted">{product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/products" className={buttonStyles({ variant: "secondary" })}>
            Skip for now
          </Link>
          {saveButton}
        </div>
      </div>

      <StockTables
        rows={rows}
        locations={product.locations}
        unit={product.unit}
        defaultCost={product.purchasePrice}
        lines={lines}
        onChange={setLines}
        stamp={stockStamp(now)}
      />

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background/90 px-4 py-3 shadow-lg shadow-navy-950/[0.06] backdrop-blur">
        <p className="text-[13px] text-muted">
          Total amount (exc. tax):{" "}
          <span className="text-base font-semibold tabular-nums text-foreground">{formatUsd(total)}</span>
        </p>
        {saveButton}
      </div>
    </div>
  );
}

/** A row per variation (keyed by index) or one for a single product. */
function stockRows(product: DemoProduct): StockRow[] {
  return product.variations.length
    ? product.variations.map((v, i) => ({ key: String(i), name: `${product.name} - ${v.name}`, current: v.stock }))
    : [{ key: "single", name: product.name, current: product.stock }];
}
