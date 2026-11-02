"use client";

/**
 * Inventory -> Selling Price Group, as in the old Opal POS:
 *
 *   - Import / export: download every product (and variation) with a price
 *     column per group, edit it, and import it back. Blank cells are skipped.
 *     CSV rather than Excel — no spreadsheet library is installed.
 *   - The groups list with Add / Edit, Activate / Deactivate and Delete.
 *     Inactive groups are hidden on the product and label screens.
 */

import { useRef, useState } from "react";

import {
  updateGroups,
  usePriceGroups,
  type PriceGroup,
} from "@/components/inventory/price-groups";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";
import { cn } from "@/lib/cn";

/** One CSV line per product, or per variation of a variable product. */
function priceRows(products: DemoProduct[]) {
  return products.flatMap((p) =>
    p.variations.length
      ? p.variations.map((v) => ({ product: p, name: p.name, variation: v.name, sku: v.sku, price: v.sellingPrice ?? p.sellingPrice }))
      : [{ product: p, name: p.name, variation: "", sku: p.sku, price: p.sellingPrice }],
  );
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

/** Minimal CSV parser: commas, quoted cells, "" escapes, \n or \r\n lines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function PriceGroupsScreen() {
  const groups = usePriceGroups();
  const [products] = useDemoProducts();
  const [editing, setEditing] = useState<{ group?: PriceGroup } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function exportPrices() {
    const header = ["Product", "Variation", "SKU", "Default selling price", ...groups.map((g) => g.name)];
    const lines = priceRows(products).map((r) =>
      [
        r.name,
        r.variation,
        r.sku,
        r.price.toFixed(2),
        ...groups.map((g) => {
          const price = r.product.groupPrices?.[g.id]?.[r.sku];
          return price != null ? price.toFixed(2) : "";
        }),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "selling-price-group-prices.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPrices() {
    if (!file) return setResult({ ok: false, text: "Choose the exported file first." });
    const rows = parseCsv(await file.text());
    const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const skuCol = header.indexOf("sku");
    if (skuCol === -1) return setResult({ ok: false, text: "That file has no SKU column — import the exported file." });
    // group columns are matched by name
    const groupCols = groups
      .map((g) => ({ group: g, col: header.indexOf(g.name.toLowerCase()) }))
      .filter((x) => x.col !== -1);
    if (groupCols.length === 0)
      return setResult({ ok: false, text: "No price group columns found — export again after adding groups." });

    let updated = 0;
    const unknown: string[] = [];
    const known = new Set(priceRows(products).map((r) => r.sku));
    const changes = new Map<string, { groupId: number; price: number }[]>();
    for (const row of rows.slice(1)) {
      const sku = row[skuCol]?.trim();
      if (!sku) continue;
      if (!known.has(sku)) {
        unknown.push(sku);
        continue;
      }
      for (const { group, col } of groupCols) {
        const cell = row[col]?.trim();
        // blank prices are skipped, as the instructions say
        if (!cell) continue;
        const price = Number(cell);
        if (!Number.isFinite(price) || price < 0) continue;
        changes.set(sku, [...(changes.get(sku) ?? []), { groupId: group.id, price }]);
        updated++;
      }
    }

    updateProducts((prev) =>
      prev.map((p) => {
        const skus = p.variations.length ? p.variations.map((v) => v.sku) : [p.sku];
        if (!skus.some((s) => changes.has(s))) return p;
        const groupPrices = { ...(p.groupPrices ?? {}) };
        for (const sku of skus)
          for (const c of changes.get(sku) ?? [])
            groupPrices[c.groupId] = { ...(groupPrices[c.groupId] ?? {}), [sku]: c.price };
        return { ...p, groupPrices };
      }),
    );
    setResult({
      ok: true,
      text: `Updated ${updated} price${updated === 1 ? "" : "s"}.${unknown.length ? ` Skipped unknown SKUs: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}` : ""}`,
    });
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const columns: DataColumn<PriceGroup>[] = [
    {
      key: "name",
      label: "Name",
      sortValue: (g) => g.name,
      text: (g) => g.name,
      render: (g) => (
        <span className="flex items-center gap-2">
          <span className={cn("font-medium", !g.active && "text-muted")}>{g.name}</span>
          {!g.active && <Badge tone="rose">Inactive</Badge>}
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      sortValue: (g) => g.description,
      text: (g) => g.description,
      render: (g) => g.description || <span className="text-muted">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <div>
            <h2 className="text-sm font-semibold">Import / export selling price group prices</h2>
            <p className="mt-0.5 text-xs text-muted">Set many group prices at once in a spreadsheet.</p>
          </div>
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col items-start gap-3">
            <Button type="button" variant="brand" onClick={exportPrices}>
              <Icon name="download" className="h-4 w-4" />
              Export selling price group prices
            </Button>
            <ol className="list-inside list-decimal space-y-1 text-[13px] text-muted">
              <li>Export selling price group prices.</li>
              <li>Update the exported file and import the same file.</li>
              <li>Only selling price group prices are updated. Blank prices are skipped.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">File to import</span>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setResult(null);
                }}
                className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
              />
            </label>
            <Button type="button" variant="secondary" className="self-start" onClick={importPrices}>
              Submit
            </Button>
            {result && (
              <p
                role="status"
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px]",
                  result.ok
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
                )}
              >
                {result.text}
              </p>
            )}
          </div>
        </div>
      </Card>

      <DataTable
        title="All selling price groups"
        subtitle="Active groups get a price column on each product"
        rows={groups}
        columns={columns}
        rowKey={(g) => g.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="price groups"
        exportName="selling-price-groups"
        minWidth={600}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add price group
          </Button>
        }
        actions={(g) => (
          <>
            <RowAction icon="pencil" label={`Edit ${g.name}`} tone="brand" onClick={() => setEditing({ group: g })} />
            <RowAction
              icon={g.active ? "eye-off" : "eye"}
              label={`${g.active ? "Deactivate" : "Activate"} ${g.name}`}
              tone="aqua"
              onClick={() =>
                setConfirm({
                  tone: g.active ? "warning" : "success",
                  confirmLabel: g.active ? "Deactivate" : "Activate",
                  message: g.active
                    ? `${g.name} will be hidden on products and labels. Its prices are kept.`
                    : `${g.name} will be available on products and labels again.`,
                  onConfirm: () =>
                    updateGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x))),
                })
              }
            />
            <RowAction
              icon="trash"
              label={`Delete ${g.name}`}
              tone="rose"
              onClick={() =>
                setConfirm({
                  tone: "danger",
                  confirmLabel: "Delete",
                  message: `${g.name} and its prices will be deleted. This can't be undone.`,
                  onConfirm: () => {
                    updateGroups((prev) => prev.filter((x) => x.id !== g.id));
                    // drop the group's prices from every product too
                    updateProducts((prev) =>
                      prev.map((p) => {
                        if (!p.groupPrices?.[g.id]) return p;
                        const rest = { ...p.groupPrices };
                        delete rest[g.id];
                        return { ...p, groupPrices: rest };
                      }),
                    );
                  },
                })
              }
            />
          </>
        )}
      />

      {editing && (
        <GroupDialog
          key={editing.group?.id ?? "new"}
          group={editing.group}
          taken={groups.filter((g) => g.id !== editing.group?.id).map((g) => g.name.toLowerCase())}
          onClose={() => setEditing(null)}
          onSave={(name, description) => {
            updateGroups((prev) =>
              editing.group
                ? prev.map((g) => (g.id === editing.group!.id ? { ...g, name, description } : g))
                : [...prev, { id: Math.max(0, ...prev.map((g) => g.id)) + 1, name, description, active: true }],
            );
            setEditing(null);
          }}
        />
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

function GroupDialog({
  group,
  taken,
  onClose,
  onSave,
}: {
  group?: PriceGroup;
  taken: string[];
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [error, setError] = useState<string>();

  function save() {
    if (!name.trim()) return setError("Name is required");
    if (taken.includes(name.trim().toLowerCase())) return setError("A price group with this name already exists");
    onSave(name.trim(), description.trim());
  }

  return (
    <Modal
      title={group ? "Edit price group" : "Add price group"}
      description="Products can set their own price for this group."
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
        <Input
          autoFocus
          label="Name *"
          placeholder="e.g. Wholesale"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Who gets these prices"
            className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
          />
        </label>
      </div>
    </Modal>
  );
}
