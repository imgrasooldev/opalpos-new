"use client";

/**
 * Inventory -> Variations: the variation templates list with an Add / Edit
 * popup (a name and its values), as in the old Opal POS screen.
 */

import { useState } from "react";

import {
  updateTemplates,
  useTemplates,
  type VariationTemplate,
} from "@/components/inventory/variation-templates";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";

const COLUMNS: DataColumn<VariationTemplate>[] = [
  {
    key: "name",
    label: "Variations",
    sortValue: (t) => t.name,
    text: (t) => t.name,
    render: (t) => <span className="font-medium">{t.name}</span>,
  },
  {
    key: "values",
    label: "Values",
    sortValue: (t) => t.values.join(", "),
    text: (t) => t.values.join(", "),
    render: (t) => (
      <span className="flex flex-wrap gap-1.5">
        {t.values.map((v) => (
          <span key={v} className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs">
            {v}
          </span>
        ))}
      </span>
    ),
  },
];

export function VariationsScreen() {
  const templates = useTemplates();
  // null = closed, {} = add, { template } = edit
  const [editing, setEditing] = useState<{ template?: VariationTemplate } | null>(null);

  return (
    <>
      <DataTable
        title="All variations"
        subtitle="Reusable value lists for variable products"
        rows={templates}
        columns={COLUMNS}
        rowKey={(t) => t.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="variations"
        exportName="variations"
        minWidth={600}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add variation
          </Button>
        }
        actions={(t) => (
          <RowAction
            icon="pencil"
            label={`Edit ${t.name}`}
            tone="brand"
            onClick={() => setEditing({ template: t })}
          />
        )}
      />

      {editing && (
        <TemplateDialog
          key={editing.template?.id ?? "new"}
          template={editing.template}
          taken={templates.filter((t) => t.id !== editing.template?.id).map((t) => t.name.toLowerCase())}
          onClose={() => setEditing(null)}
          onSave={(name, values) => {
            updateTemplates((prev) =>
              editing.template
                ? prev.map((t) => (t.id === editing.template!.id ? { ...t, name, values } : t))
                : [...prev, { id: Math.max(0, ...prev.map((t) => t.id)) + 1, name, values }],
            );
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

let rowKey = 0;

function TemplateDialog({
  template,
  taken,
  onClose,
  onSave,
}: {
  template?: VariationTemplate;
  /** Other templates' names, lowercased — names must be unique. */
  taken: string[];
  onClose: () => void;
  onSave: (name: string, values: string[]) => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [values, setValues] = useState(() =>
    (template?.values.length ? template.values : [""]).map((value) => ({ key: ++rowKey, value })),
  );
  const [errors, setErrors] = useState<{ name?: string; values?: string }>({});

  function save() {
    const cleaned = values.map((v) => v.value.trim()).filter(Boolean);
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Variation name is required";
    else if (taken.includes(name.trim().toLowerCase())) next.name = "A variation with this name already exists";
    if (cleaned.length === 0) next.values = "Add at least one value";
    else if (new Set(cleaned.map((v) => v.toLowerCase())).size !== cleaned.length)
      next.values = "Values must be unique";
    setErrors(next);
    if (Object.keys(next).length === 0) onSave(name.trim(), cleaned);
  }

  return (
    <Modal
      title={template ? "Edit variation" : "Add variation"}
      description="A name and the values products can pick from."
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
          label="Variation name *"
          placeholder="e.g. Color"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">Values *</legend>
          {values.map((v, i) => (
            <div key={v.key} className="flex gap-2">
              <input
                aria-label={`Value ${i + 1}`}
                value={v.value}
                placeholder={i === 0 ? "e.g. Red" : "Value"}
                onChange={(event) => {
                  const value = event.target.value;
                  setValues((prev) => prev.map((x) => (x.key === v.key ? { ...x, value } : x)));
                  setErrors((prev) => ({ ...prev, values: undefined }));
                }}
                onKeyDown={(event) => {
                  // Enter on the last value adds another
                  if (event.key === "Enter" && i === values.length - 1 && v.value.trim()) {
                    event.preventDefault();
                    setValues((prev) => [...prev, { key: ++rowKey, value: "" }]);
                  }
                }}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
              />
              <button
                type="button"
                aria-label={`Remove value ${i + 1}`}
                disabled={values.length === 1}
                onClick={() => setValues((prev) => prev.filter((x) => x.key !== v.key))}
                className="rounded-lg px-2 text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {errors.values && <p className="text-xs text-red-600">{errors.values}</p>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setValues((prev) => [...prev, { key: ++rowKey, value: "" }])}
          >
            <Icon name="plus" className="h-4 w-4" />
            Add value
          </Button>
        </fieldset>
      </div>
    </Modal>
  );
}
