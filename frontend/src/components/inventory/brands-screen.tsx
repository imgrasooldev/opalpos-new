"use client";

/**
 * Inventory -> Brands, as in the old Opal POS: brand and note, with Add /
 * Edit in a popup and Delete behind "Are you sure?". A brand still used by
 * products can't be deleted.
 */

import { useState } from "react";

import { updateBrands, useBrands, type Brand } from "@/components/inventory/brands";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";

export function BrandsScreen() {
  const brands = useBrands();
  const [products] = useDemoProducts();
  const [editing, setEditing] = useState<{ brand?: Brand } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const usedBy = (b: Brand) => products.filter((p) => p.brand === b.name).length;

  const columns: DataColumn<Brand>[] = [
    {
      key: "name",
      label: "Brands",
      sortValue: (b) => b.name,
      text: (b) => b.name,
      render: (b) => <span className="font-medium">{b.name}</span>,
    },
    {
      key: "note",
      label: "Note",
      sortValue: (b) => b.note,
      text: (b) => b.note,
      render: (b) => b.note || <span className="text-muted">—</span>,
    },
    {
      key: "products",
      label: "Products",
      sortValue: usedBy,
      text: (b) => String(usedBy(b)),
      render: (b) => <span className="text-muted">{usedBy(b)}</span>,
      align: "right",
    },
  ];

  return (
    <>
      <DataTable
        title="All your brands"
        subtitle="Who makes the products you sell"
        rows={brands}
        columns={columns}
        rowKey={(b) => b.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="brands"
        exportName="brands"
        minWidth={600}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add brand
          </Button>
        }
        actions={(b) => (
          <>
            <RowAction icon="pencil" label={`Edit ${b.name}`} tone="brand" onClick={() => setEditing({ brand: b })} />
            <RowAction
              icon="trash"
              label={`Delete ${b.name}`}
              tone="rose"
              onClick={() => {
                const count = usedBy(b);
                if (count > 0) {
                  setBlocked(
                    `${count} product${count === 1 ? " uses" : "s use"} ${b.name}. Change their brand first, then delete it.`,
                  );
                  return;
                }
                setConfirm({
                  tone: "danger",
                  confirmLabel: "Delete",
                  message: `The ${b.name} brand will be deleted.`,
                  onConfirm: () => updateBrands((prev) => prev.filter((x) => x.id !== b.id)),
                });
              }}
            />
          </>
        )}
      />

      {editing && (
        <BrandDialog
          key={editing.brand?.id ?? "new"}
          brand={editing.brand}
          taken={brands.filter((b) => b.id !== editing.brand?.id).map((b) => b.name.toLowerCase())}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            const before = editing.brand;
            if (before) {
              updateBrands((prev) => prev.map((b) => (b.id === before.id ? { ...b, ...values } : b)));
              // products refer to brands by name, so a rename carries over
              if (before.name !== values.name)
                updateProducts((prev) =>
                  prev.map((p) => (p.brand === before.name ? { ...p, brand: values.name } : p)),
                );
            } else {
              updateBrands((prev) => [...prev, { id: Math.max(0, ...prev.map((b) => b.id)) + 1, ...values }]);
            }
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

      {blocked && (
        <Modal
          title="Can't delete this brand"
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
    </>
  );
}

export function BrandDialog({
  brand,
  taken,
  onClose,
  onSave,
}: {
  brand?: Brand;
  /** Other brands' names, lowercased — names must be unique. */
  taken: string[];
  onClose: () => void;
  onSave: (values: Omit<Brand, "id">) => void;
}) {
  const [name, setName] = useState(brand?.name ?? "");
  const [note, setNote] = useState(brand?.note ?? "");
  const [error, setError] = useState<string>();

  function save() {
    if (!name.trim()) return setError("Brand name is required");
    if (taken.includes(name.trim().toLowerCase())) return setError("A brand with this name already exists");
    onSave({ name: name.trim(), note: note.trim() });
  }

  return (
    <Modal
      title={brand ? "Edit brand" : "Add brand"}
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {brand ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          autoFocus
          label="Brand name *"
          placeholder="Brand name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Input
          label="Short description"
          placeholder="Short description"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}
