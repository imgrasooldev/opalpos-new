"use client";

/**
 * Product details popup behind Actions -> View, laid out like the old Opal POS
 * one: product facts in three columns with the image, rack / row / position
 * per location, prices per variation, and stock details.
 *
 * Inc.-tax prices use the product's applicable tax (8.25% in the demo data).
 * Stock is tracked per product / variation, so the location column lists all
 * of the product's locations.
 */

import { LOCATION_CODES, type DemoProduct } from "@/components/inventory/products-data";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUMBER = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "Sales tax 8.25%" -> 0.0825 */
const taxRate = (tax: string | null) => (tax ? Number(tax.match(/([\d.]+)%/)?.[1] ?? 0) / 100 : 0);

export function ViewProductDialog({ product, onClose }: { product: DemoProduct; onClose: () => void }) {
  const rate = taxRate(product.tax);
  const rows = product.variations.length
    ? product.variations.map((v) => ({
        name: v.name,
        sku: v.sku,
        purchase: v.purchasePrice ?? product.purchasePrice,
        selling: v.sellingPrice ?? product.sellingPrice,
        age: v.ageVerification ?? product.ageVerification ?? false,
        stock: v.stock,
        sold: v.sold,
        transferred: 0,
        adjusted: 0,
      }))
    : [
        {
          name: product.name,
          sku: product.sku,
          purchase: product.purchasePrice,
          selling: product.sellingPrice,
          age: product.ageVerification ?? false,
          stock: product.stock,
          sold: product.sold,
          transferred: product.transferred,
          adjusted: product.adjusted,
        },
      ];
  const margin = (p: number, s: number) => (p > 0 ? NUMBER.format((s / p - 1) * 100) : "—");
  const locations = product.locations.length
    ? product.locations.map((l) => `${l} (${LOCATION_CODES[l]})`).join(", ")
    : "None";

  return (
    <Modal
      title={product.name}
      description={`${product.type} product`}
      onClose={onClose}
      className="max-w-6xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={() => window.print()}>
            <Icon name="printer" className="h-4 w-4" />
            Print
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr_220px]">
          <Facts
            items={[
              ["SKU", <span key="sku" className="font-mono text-xs">{product.sku}</span>],
              ["Brand", product.brand],
              ["Unit", product.unit],
              ["Barcode type", product.barcodeType ?? "UPC-A"],
              ["Available in locations", locations],
            ]}
          />
          <Facts
            items={[
              ["Category", product.category],
              ["Sub category", null],
              ["Manage stock?", product.manageStock === false ? "No" : "Yes"],
              ["Alert quantity", product.alertQuantity != null ? NUMBER.format(product.alertQuantity) : null],
            ]}
          />
          <Facts
            items={[
              ["Expires in", "Not applicable"],
              ["Applicable tax", product.tax ?? "None"],
              ["Selling price tax type", product.taxType ?? "Exclusive"],
              ["Product type", product.type],
              ["Age restriction", <Restriction key="age" age={product.ageVerification ?? false} />],
            ]}
          />
          {/* image upload isn't wired up yet */}
          <div className="flex aspect-square items-center justify-center rounded-xl border border-line bg-surface text-muted">
            <Icon name="cube" className="h-12 w-12" />
          </div>
        </div>

        <Block title="Rack, row & position">
          <Table head={["Location", "Rack", "Row", "Position"]}>
            {product.locations.map((l) => {
              const shelf = product.shelves?.[l];
              return (
                <tr key={l} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">{l}</td>
                  <td className="px-4 py-2.5">{shelf?.rack || dash}</td>
                  <td className="px-4 py-2.5">{shelf?.row || dash}</td>
                  <td className="px-4 py-2.5">{shelf?.position || dash}</td>
                </tr>
              );
            })}
            {product.locations.length === 0 && <Empty cols={4} text="Not in any location." />}
          </Table>
        </Block>

        <Block title={product.variations.length ? `Variations: ${product.name}` : "Prices"}>
          <Table
            head={[
              product.variations.length ? "Variation" : "Product",
              "SKU",
              "Purchase price (exc. tax)",
              "Purchase price (inc. tax)",
              "× Margin (%)",
              "Selling price (exc. tax)",
              "Selling price (inc. tax)",
              "Restriction",
              "Images",
            ]}
            right={[2, 3, 4, 5, 6]}
          >
            {rows.map((r) => (
              <tr key={r.sku} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{r.sku}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{USD.format(r.purchase)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{USD.format(r.purchase * (1 + rate))}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{margin(r.purchase, r.selling)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{USD.format(r.selling)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{USD.format(r.selling * (1 + rate))}</td>
                <td className="px-4 py-2.5">
                  <Restriction age={r.age} short />
                </td>
                <td className="px-4 py-2.5">{dash}</td>
              </tr>
            ))}
          </Table>
        </Block>

        <Block title="Product stock details">
          <Table
            head={[
              "SKU",
              "Product",
              "Location",
              "Unit price",
              "Current stock",
              "Current stock value",
              "Total unit sold",
              "Total unit transferred",
              "Total unit adjusted",
            ]}
            right={[3, 4, 5, 6, 7, 8]}
          >
            {rows.map((r) => (
              <tr key={r.sku} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{r.sku}</td>
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5">{product.locations.join(", ") || dash}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{USD.format(r.selling)}</td>
                <td className={cn("px-4 py-2.5 text-right tabular-nums", r.stock <= 0 && "font-medium text-rose-600")}>
                  {NUMBER.format(r.stock)} {product.unit}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {USD.format(Math.max(0, r.stock) * r.selling)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{NUMBER.format(r.sold)} {product.unit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {NUMBER.format(r.transferred)} {product.unit}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {NUMBER.format(r.adjusted)} {product.unit}
                </td>
              </tr>
            ))}
          </Table>
        </Block>
      </div>
    </Modal>
  );
}

const dash = <span className="text-muted">—</span>;

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-2 text-[13px]">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-wrap gap-x-2">
          <dt className="font-medium">{label}:</dt>
          <dd className="text-muted">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Restriction({ age, short }: { age: boolean; short?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium",
        age
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {age ? (short ? "Age verified" : "Age verification required") : short ? "Normal" : "Normal product"}
    </span>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Table({
  head,
  right = [],
  children,
}: {
  head: string[];
  right?: number[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface text-xs text-muted">
            {head.map((h, i) => (
              <th
                key={h}
                className={cn("whitespace-nowrap px-4 py-2.5 font-medium", right.includes(i) && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-6 text-center text-muted">
        {text}
      </td>
    </tr>
  );
}
