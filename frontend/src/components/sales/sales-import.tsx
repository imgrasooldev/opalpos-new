"use client";

/**
 * Sell -> Import sales, as in the old Opal POS:
 *
 *   1. pick a file and "Upload and review" (or download the template)
 *   2. review: business location, the column that groups lines into one
 *      sale, which sale field each column holds, then a preview of the sales
 *      with any problems (unknown product, missing quantity, not enough stock)
 *   3. import: creates the Final sales (customers too, when new) and takes the
 *      stock out; each import is a batch in "Imports" that can be reverted
 *
 * CSV rather than Excel, like the other demo imports. STAND-IN FOR THE API.
 */

import { useMemo, useRef, useState } from "react";

import { nextContactId, updateCustomers, useCustomers } from "@/components/contacts/customer-store";
import type { DemoCustomer } from "@/components/contacts/customers-data";
import { createDemoStore } from "@/components/inventory/demo-store";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { LOCATION_CODES, PRODUCT_LOCATIONS, type DemoProduct } from "@/components/inventory/products-data";
import {
  applySale,
  nextInvoiceNo,
  saleTotals,
  updateSales,
  useSales,
  useSellReturns,
  type Sale,
  type SaleLine,
} from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { csvCell, downloadCsv, parseCsv } from "@/lib/csv";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ---------- fields ----------

const FIELDS = [
  { key: "invoiceNo", label: "Invoice No.", note: "" },
  { key: "customerName", label: "Customer name", note: "" },
  { key: "customerPhone", label: "Customer Phone number", note: "Either customer email id or phone number required" },
  { key: "customerEmail", label: "Customer Email", note: "Either customer email id or phone number required" },
  { key: "saleDate", label: "Sale Date", note: 'Sale date time format should be "Y-m-d H:i:s" (2020-07-15 17:45:32)' },
  { key: "productName", label: "Product Name", note: "Either product name (for single and combo only) or product sku required" },
  { key: "productSku", label: "Product SKU", note: "Either product name (for single and combo only) or product sku required" },
  { key: "quantity", label: "Quantity", note: "Required" },
  { key: "productUnit", label: "Product Unit", note: "" },
  { key: "unitPrice", label: "Unit Price", note: "" },
  { key: "itemTax", label: "Item Tax", note: "" },
  { key: "itemDiscount", label: "Item Discount", note: "" },
  { key: "itemDescription", label: "Item Description", note: "" },
  { key: "orderTotal", label: "Order Total", note: "" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
/** Header -> field, by name ("Customer Phone number", "customer_phone" …). */
function guessField(header: string): FieldKey | "" {
  const h = normalize(header);
  const hit = FIELDS.find((f) => normalize(f.label) === h || normalize(f.key) === h);
  if (hit) return hit.key;
  if (h.includes("invoice")) return "invoiceNo";
  if (h.includes("sku")) return "productSku";
  if (h.includes("phone") || h.includes("mobile")) return "customerPhone";
  if (h.includes("email")) return "customerEmail";
  if (h.includes("qty") || h.includes("quantity")) return "quantity";
  return "";
}

/** "2026-11-03 14:05:00" (or a bare date) -> "2026-11-03T14:05"; null when unreadable. */
function parseDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}` : null;
}

const nowLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

// ---------- import batches ----------

type SaleImport = { id: number; batch: string; time: string; createdBy: string; saleIds: number[]; invoices: string[] };
const imports = createDemoStore<SaleImport>("opalpay.demo-sale-imports", []);

// ---------- screen ----------

type Parsed = { name: string; headers: string[]; rows: string[][] };

export function SalesImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileError, setFileError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const batches = imports.use();
  const sales = useSales();
  const returns = useSellReturns();
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [products] = useDemoProducts();

  async function upload() {
    setDone(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setFileError("Choose a file to import first");
    if (!/\.csv$/i.test(file.name)) return setFileError("Upload a .csv file (download the template to see the layout)");
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return setFileError("The file has no rows under the header");
    setFileError("");
    setParsed({ name: file.name, headers: rows[0].map((h) => h.trim()), rows: rows.slice(1) });
  }

  function template() {
    const sku = (p: DemoProduct | undefined) => (p?.variations.length ? p.variations[0].sku : (p?.sku ?? ""));
    const a = products.find((p) => p.id === 7);
    const b = products.find((p) => p.id === 4);
    downloadCsv("import-sales-template.csv", [
      FIELDS.map((f) => csvCell(f.label)).join(","),
      ["INV-1001", "Walk-In Customer", "", "", "2026-11-03 10:15:00", "", sku(a), "2", "Pcs", "12.00", "", "0", "", ""].map(csvCell).join(","),
      ["INV-1001", "Walk-In Customer", "", "", "2026-11-03 10:15:00", b?.name ?? "", "", "5", "Pcs", "1.50", "", "0", "", ""].map(csvCell).join(","),
      ["INV-1002", "Sana Malik", "+1 555 010 9001", "sana@example.com", "2026-11-03 12:40:00", "", sku(a), "1", "Pcs", "", "", "1", "Gift wrap", ""].map(csvCell).join(","),
    ]);
  }

  function revert(b: SaleImport) {
    const withReturns = sales.filter((s) => b.saleIds.includes(s.id) && returns.some((r) => r.saleId === s.id));
    if (withReturns.length) {
      setBlocked(`${withReturns.map((s) => s.invoiceNo).join(", ")} ha${withReturns.length === 1 ? "s" : "ve"} sell returns. Delete those first.`);
      return;
    }
    setConfirm({
      tone: "danger",
      confirmLabel: "Revert",
      message: `Batch ${b.batch} will be undone: its ${b.saleIds.length} sales are deleted and their items go back into stock.`,
      onConfirm: () => {
        const gone = sales.filter((s) => b.saleIds.includes(s.id));
        updateSales((prev) => prev.filter((s) => !b.saleIds.includes(s.id)));
        updateProducts((prev) => gone.reduce((acc, s) => applySale(acc, s, "Import revert", -1), prev));
        imports.update((prev) => prev.filter((x) => x.id !== b.id));
      },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {done && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <Icon name="receipt" className="h-4 w-4" />
          {done}
        </div>
      )}

      <Card bodyClassName="pt-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-72 flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">File to import</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFileName(event.target.files?.[0]?.name ?? "");
                setFileError("");
              }}
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
            />
          </label>
          <Button type="button" variant="brand" onClick={upload} disabled={!fileName}>
            <Icon name="download" className="h-4 w-4 rotate-180" />
            Upload and review
          </Button>
          <button
            type="button"
            onClick={template}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Icon name="download" className="h-4 w-4" />
            Download template file
          </button>
        </div>
        {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
        <p className="mt-2 text-xs text-muted">CSV files (.csv). Save an Excel sheet as CSV before uploading.</p>
      </Card>

      <Card title="Instructions" bodyClassName="border-t border-line pt-4">
        <ol className="flex flex-col gap-2 text-[13px]">
          <li>1. Upload sales data in CSV format (the template has every column).</li>
          <li>2. Choose the business location and the column by which sell lines will be grouped.</li>
          <li>3. Choose the respective sales field for each column.</li>
          <li>
            4. Importable fields:
            <div className="mt-2 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface text-xs text-muted">
                    <th className="px-3 py-2 font-medium">Importable fields</th>
                    <th className="px-3 py-2 font-medium">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map((f) => (
                    <tr key={f.key} className="border-b border-line last:border-0">
                      <td className="px-3 py-1.5">{f.label}</td>
                      <td className="px-3 py-1.5 text-xs text-muted">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>
        </ol>
      </Card>

      <Card title="Imports" bodyClassName="border-t border-line pt-4">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th className="px-3 py-2 font-medium">Import batch</th>
                <th className="px-3 py-2 font-medium">Import time</th>
                <th className="px-3 py-2 font-medium">Created by</th>
                <th className="px-3 py-2 font-medium">Invoices</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...batches].reverse().map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{b.batch}</td>
                  <td className="px-3 py-2">{new Date(b.time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="px-3 py-2">{b.createdBy}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.invoices.join(", ")}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => revert(b)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                    >
                      <Icon name="refund" className="h-3.5 w-3.5" />
                      Revert import
                    </button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    No imports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {parsed && (
        <ReviewDialog
          parsed={parsed}
          onClose={() => setParsed(null)}
          onDone={(message) => {
            setParsed(null);
            setDone(message);
            if (fileRef.current) fileRef.current.value = "";
            setFileName("");
          }}
        />
      )}

      {blocked && (
        <Modal
          title="Can't revert this import"
          onClose={() => setBlocked(null)}
          className="max-w-sm"
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

// ---------- review ----------

type Planned = {
  invoiceNo: string;
  customer: { existing?: DemoCustomer; name: string; phone: string; email: string };
  date: string;
  lines: SaleLine[];
  errors: string[];
};

function ReviewDialog({ parsed, onClose, onDone }: { parsed: Parsed; onClose: () => void; onDone: (message: string) => void }) {
  const [products] = useDemoProducts();
  const customers = useCustomers();
  const sales = useSales();
  const [location, setLocation] = useState("");
  const [mapping, setMapping] = useState<(FieldKey | "")[]>(() => parsed.headers.map(guessField));
  const [groupBy, setGroupBy] = useState(() => {
    const i = parsed.headers.map(guessField).indexOf("invoiceNo");
    return String(i >= 0 ? i : 0);
  });

  const col = (key: FieldKey) => mapping.indexOf(key);

  const plan = useMemo<Planned[]>(() => {
    const cell = (row: string[], key: FieldKey) => {
      const i = mapping.indexOf(key);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };
    const groups = new Map<string, string[][]>();
    parsed.rows.forEach((row) => {
      const key = (row[Number(groupBy)] ?? "").trim() || `row-${groups.size + 1}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    const used = new Set(sales.map((s) => s.invoiceNo));
    let next = Number(nextInvoiceNo(sales).split("-")[1]);
    // stock already promised to earlier sales in this file
    const taken = new Map<string, number>();

    return [...groups.values()].map((rows) => {
      const first = rows[0];
      const errors: string[] = [];
      let invoiceNo = cell(first, "invoiceNo");
      if (!invoiceNo) invoiceNo = `${new Date().getFullYear()}-${String(next++).padStart(6, "0")}`;
      else if (used.has(invoiceNo)) errors.push(`Invoice ${invoiceNo} already exists`);
      used.add(invoiceNo);

      const name = cell(first, "customerName");
      const phone = cell(first, "customerPhone");
      const email = cell(first, "customerEmail");
      const existing =
        customers.find((c) => (phone && c.mobile === phone) || (email && c.email === email)) ??
        (!phone && !email ? customers.find((c) => c.name.toLowerCase() === (name || "walk-in customer").toLowerCase()) : undefined);
      if (!existing && !phone && !email) errors.push(`Customer "${name || "(blank)"}" not found: add a phone number or email`);

      const rawDate = cell(first, "saleDate");
      const date = rawDate ? parseDate(rawDate) : nowLocal();
      if (!date) errors.push(`Sale date "${rawDate}" isn't Y-m-d H:i:s`);

      const lines: SaleLine[] = [];
      rows.forEach((row, i) => {
        const where = rows.length > 1 ? ` (line ${i + 1})` : "";
        const sku = cell(row, "productSku");
        const pname = cell(row, "productName");
        let product: DemoProduct | undefined;
        let lineSku = "";
        let lineName = "";
        let stock = 0;
        if (sku) {
          for (const p of products) {
            const v = p.variations.find((x) => x.sku.toLowerCase() === sku.toLowerCase());
            if (v) [product, lineSku, lineName, stock] = [p, v.sku, `${p.name} - ${v.name}`, v.stock];
            else if (!p.variations.length && p.sku.toLowerCase() === sku.toLowerCase()) [product, lineSku, lineName, stock] = [p, p.sku, p.name, p.stock];
            if (product) break;
          }
          if (!product) errors.push(`No product with SKU ${sku}${where}`);
        } else if (pname) {
          const p = products.find((x) => x.name.toLowerCase() === pname.toLowerCase());
          if (!p) errors.push(`No product named "${pname}"${where}`);
          else if (p.variations.length) errors.push(`${p.name} has variations: use its SKU${where}`);
          else [product, lineSku, lineName, stock] = [p, p.sku, p.name, p.stock];
        } else errors.push(`Product name or SKU missing${where}`);

        const qty = Number(cell(row, "quantity"));
        if (!(qty > 0)) errors.push(`Quantity missing or zero${where}`);
        if (!product) return;
        if (location && !product.locations.includes(location)) errors.push(`${lineName} isn't sold at ${location}`);
        if (product.manageStock !== false && qty > 0) {
          const left = stock - (taken.get(lineSku) ?? 0);
          if (qty > left) errors.push(`${lineName}: only ${left.toFixed(2)} in stock${where}`);
          taken.set(lineSku, (taken.get(lineSku) ?? 0) + qty);
        }
        const price = cell(row, "unitPrice");
        const variation = product.variations.find((v) => v.sku === lineSku);
        lines.push({
          productId: product.id,
          sku: lineSku,
          name: lineName,
          qty: qty > 0 ? qty : 0,
          unitPrice: price ? Number(price) || 0 : (variation?.sellingPrice ?? product.sellingPrice),
          discountType: "Fixed",
          discount: Number(cell(row, "itemDiscount")) || 0,
        });
      });

      return { invoiceNo, customer: { existing, name: name || existing?.name || "", phone, email }, date: date ?? nowLocal(), lines, errors };
    });
  }, [parsed, mapping, groupBy, location, products, customers, sales]);

  const problems = plan.flatMap((p) => p.errors.map((e) => `${p.invoiceNo}: ${e}`));
  const missingMap = col("quantity") < 0 || (col("productSku") < 0 && col("productName") < 0);

  function runImport() {
    let customerId = Math.max(0, ...customers.map((c) => c.id));
    let saleId = Math.max(0, ...sales.map((s) => s.id));
    const newCustomers: DemoCustomer[] = [];
    let contactSeed = Number(nextContactId(customers));
    const created: Sale[] = plan.map((p) => {
      let cid = p.customer.existing?.id;
      // same new customer on several invoices -> created once
      const again = newCustomers.find((c) => (p.customer.phone && c.mobile === p.customer.phone) || (p.customer.email && c.email === p.customer.email));
      if (!cid && again) cid = again.id;
      if (!cid) {
        cid = ++customerId;
        newCustomers.push({
          id: cid,
          contactId: String(contactSeed++).padStart(4, "0"),
          businessName: null,
          name: p.customer.name || p.customer.phone || p.customer.email,
          email: p.customer.email || null,
          taxNumber: null,
          creditLimit: null,
          payTerm: null,
          openingBalance: 0,
          advanceBalance: 0,
          addedOn: p.date.slice(0, 10),
          opalPoints: 0,
          group: null,
          address: null,
          mobile: p.customer.phone || null,
          dob: null,
          saleDue: 0,
          sellReturnDue: 0,
          lastSaleOn: p.date.slice(0, 10),
          assignedTo: null,
          active: true,
          customFields: [null, null, null, null, null],
        });
      }
      return {
        id: ++saleId,
        invoiceNo: p.invoiceNo,
        date: p.date,
        location,
        customerId: cid,
        status: "Final",
        payTerm: null,
        invoiceScheme: "Default",
        lines: p.lines,
        discountType: "None",
        discountAmount: 0,
        pointsRedeemed: 0,
        orderTax: null,
        sellNote: "Imported",
        staffNote: "",
        shippingDetails: "",
        shippingAddress: "",
        shippingCharges: 0,
        shippingStatus: null,
        deliveredTo: "",
        expenses: [],
        payments: [],
        addedBy: "Adnan Ahmed",
        source: "Sale",
      };
    });

    if (newCustomers.length) updateCustomers((prev) => [...prev, ...newCustomers]);
    updateSales((prev) => [...prev, ...created]);
    updateProducts((prev) => created.reduce((acc, s) => applySale(acc, s, `Import ${parsed.name}`, 1), prev));
    imports.update((prev) => {
      const id = Math.max(0, ...prev.map((b) => b.id)) + 1;
      return [
        ...prev,
        {
          id,
          batch: `IMP${new Date().getFullYear()}/${String(id).padStart(4, "0")}`,
          time: new Date().toISOString(),
          createdBy: "Adnan Ahmed",
          saleIds: created.map((s) => s.id),
          invoices: created.map((s) => s.invoiceNo),
        },
      ];
    });
    onDone(
      `Imported ${created.length} sale${created.length === 1 ? "" : "s"} from ${parsed.name}` +
        (newCustomers.length ? ` and added ${newCustomers.length} new customer${newCustomers.length === 1 ? "" : "s"}` : "") +
        ". They're on All sales as Due.",
    );
  }

  const selectClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-navy-700 dark:bg-navy-900";

  return (
    <Modal
      title="Review import"
      description={`${parsed.name} · ${parsed.rows.length} rows`}
      onClose={onClose}
      className="max-w-5xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={runImport} disabled={!location || missingMap || problems.length > 0}>
            Import {plan.length} sale{plan.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Business location *</span>
          <select value={location} onChange={(event) => setLocation(event.target.value)} className={cn(selectClass, !location && "border-amber-400")}>
            <option value="">Please select</option>
            {PRODUCT_LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l} ({LOCATION_CODES[l]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Group sell lines by *</span>
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} className={selectClass}>
            {parsed.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `Column ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-2 mt-5 text-sm font-semibold">Columns</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Column in file</th>
              <th className="px-3 py-2 font-medium">First value</th>
              <th className="px-3 py-2 font-medium">Sales field</th>
            </tr>
          </thead>
          <tbody>
            {parsed.headers.map((h, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-3 py-1.5 font-medium">{h || `Column ${i + 1}`}</td>
                <td className="max-w-48 truncate px-3 py-1.5 text-muted">{parsed.rows[0][i] || "-"}</td>
                <td className="px-3 py-1.5">
                  <select
                    aria-label={`Field for ${h}`}
                    value={mapping[i]}
                    onChange={(event) => setMapping((prev) => prev.map((m, j) => (j === i ? (event.target.value as FieldKey | "") : m)))}
                    className={cn(selectClass, "py-1.5")}
                  >
                    <option value="">Skip this column</option>
                    {FIELDS.map((f) => (
                      <option key={f.key} value={f.key} disabled={mapping.includes(f.key) && mapping[i] !== f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missingMap && <p className="mt-2 text-xs text-red-600">Map a Quantity column, and a Product SKU or Product Name column.</p>}

      <p className="mb-2 mt-5 text-sm font-semibold">Sales to create</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Invoice no</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Products</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Check</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((p) => {
              const t = saleTotals({ lines: p.lines, discountType: "None", discountAmount: 0, pointsRedeemed: 0, orderTax: null, shippingCharges: 0, expenses: [], payments: [] });
              return (
                <tr key={p.invoiceNo} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{p.invoiceNo}</td>
                  <td className="px-3 py-2">
                    {p.customer.existing?.name ?? p.customer.name}
                    {!p.customer.existing && (p.customer.phone || p.customer.email) && (
                      <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-medium text-brand-600 dark:bg-brand-900 dark:text-brand-200">new</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted">{p.date.replace("T", " ")}</td>
                  <td className="px-3 py-2">{p.lines.map((l) => `${l.name} × ${l.qty}`).join(", ") || "-"}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(t.total)}</td>
                  <td className="px-3 py-2">
                    {p.errors.length ? (
                      <span className="text-xs text-red-600">{p.errors.join("; ")}</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!location && <p className="mt-2 text-xs text-amber-600">Pick the business location to import into.</p>}
      {problems.length > 0 && (
        <p className="mt-2 text-xs text-red-600">
          {problems.length} problem{problems.length === 1 ? "" : "s"} to fix in the file before importing.
        </p>
      )}
    </Modal>
  );
}
