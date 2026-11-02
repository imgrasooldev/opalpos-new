"use client";

/**
 * Inventory -> Units, as in the old Opal POS: name, short name, allow
 * decimal, with Add / Edit in a popup and Delete. A unit still used by a
 * product can't be deleted, so no product is left without its unit.
 */

import { useState } from "react";

import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { updateUnits, useUnits, type Unit } from "@/components/inventory/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";

export function UnitsScreen() {
  const units = useUnits();
  const [products] = useDemoProducts();
  const [editing, setEditing] = useState<{ unit?: Unit } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const usedBy = (u: Unit) => products.filter((p) => p.unit === u.shortName).length;

  const columns: DataColumn<Unit>[] = [
    {
      key: "name",
      label: "Name",
      sortValue: (u) => u.name,
      text: (u) => u.name,
      render: (u) => <span className="font-medium">{u.name}</span>,
    },
    { key: "shortName", label: "Short name", sortValue: (u) => u.shortName, text: (u) => u.shortName },
    {
      key: "allowDecimal",
      label: "Allow decimal",
      sortValue: (u) => (u.allowDecimal ? 1 : 0),
      text: (u) => (u.allowDecimal ? "Yes" : "No"),
      render: (u) => <Badge tone={u.allowDecimal ? "green" : "neutral"}>{u.allowDecimal ? "Yes" : "No"}</Badge>,
    },
    {
      key: "products",
      label: "Products",
      sortValue: usedBy,
      text: (u) => String(usedBy(u)),
      render: (u) => <span className="text-muted">{usedBy(u)}</span>,
      align: "right",
    },
  ];

  return (
    <>
      <DataTable
        title="All your units"
        subtitle="How products are counted — pieces, boxes, kilograms…"
        rows={units}
        columns={columns}
        rowKey={(u) => u.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="units"
        exportName="units"
        minWidth={640}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add unit
          </Button>
        }
        actions={(u) => (
          <>
            <RowAction icon="pencil" label={`Edit ${u.name}`} tone="brand" onClick={() => setEditing({ unit: u })} />
            <RowAction
              icon="trash"
              label={`Delete ${u.name}`}
              tone="rose"
              onClick={() => {
                const count = usedBy(u);
                if (count > 0) {
                  setBlocked(
                    `${u.name} is used by ${count} product${count === 1 ? "" : "s"}. Change their unit first, then delete it.`,
                  );
                  return;
                }
                setConfirm({
                  tone: "danger",
                  confirmLabel: "Delete",
                  message: `The ${u.name} unit will be deleted.`,
                  onConfirm: () => updateUnits((prev) => prev.filter((x) => x.id !== u.id)),
                });
              }}
            />
          </>
        )}
      />

      {editing && (
        <UnitDialog
          key={editing.unit?.id ?? "new"}
          unit={editing.unit}
          taken={units.filter((u) => u.id !== editing.unit?.id)}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            const before = editing.unit;
            if (before) {
              updateUnits((prev) => prev.map((u) => (u.id === before.id ? { ...u, ...values } : u)));
              // products refer to the short name, so a rename carries over to them
              if (before.shortName !== values.shortName)
                updateProducts((prev) =>
                  prev.map((p) => (p.unit === before.shortName ? { ...p, unit: values.shortName } : p)),
                );
            } else {
              updateUnits((prev) => [...prev, { id: Math.max(0, ...prev.map((u) => u.id)) + 1, ...values }]);
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
          title="Can't delete this unit"
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

export function UnitDialog({
  unit,
  taken,
  onClose,
  onSave,
}: {
  unit?: Unit;
  /** The other units — names and short names must be unique. */
  taken: Unit[];
  onClose: () => void;
  onSave: (values: Omit<Unit, "id">) => void;
}) {
  const [name, setName] = useState(unit?.name ?? "");
  const [shortName, setShortName] = useState(unit?.shortName ?? "");
  const [allowDecimal, setAllowDecimal] = useState(unit?.allowDecimal ?? false);
  const [errors, setErrors] = useState<{ name?: string; shortName?: string }>({});

  function save() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    else if (taken.some((u) => u.name.toLowerCase() === name.trim().toLowerCase()))
      next.name = "A unit with this name already exists";
    if (!shortName.trim()) next.shortName = "Short name is required";
    else if (taken.some((u) => u.shortName.toLowerCase() === shortName.trim().toLowerCase()))
      next.shortName = "A unit with this short name already exists";
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ name: name.trim(), shortName: shortName.trim(), allowDecimal });
  }

  return (
    <Modal
      title={unit ? "Edit unit" : "Add unit"}
      description="The short name is what products and receipts show."
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
          placeholder="e.g. Pieces"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />
        <Input
          label="Short name *"
          placeholder="e.g. Pcs"
          value={shortName}
          onChange={(event) => {
            setShortName(event.target.value);
            setErrors((prev) => ({ ...prev, shortName: undefined }));
          }}
          error={errors.shortName}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Allow decimal *</span>
          <select
            value={allowDecimal ? "yes" : "no"}
            onChange={(event) => setAllowDecimal(event.target.value === "yes")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
          >
            <option value="no">No — whole numbers only (e.g. pieces)</option>
            <option value="yes">Yes — fractions allowed (e.g. 1.5 kg)</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}
