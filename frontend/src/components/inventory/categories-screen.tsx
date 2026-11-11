"use client";

/**
 * Inventory -> Categories, as in the old Opal POS: category, code (HSN),
 * description, with Add / Edit in a popup ("Add as sub taxonomy" picks a
 * parent) and Delete behind "Are you sure?". A category still used by
 * products or sub categories can't be deleted.
 */

import { useState } from "react";

import {
  updateCategories,
  useCategories,
  type Category,
} from "@/components/inventory/categories";
import { updateProducts, useDemoProducts } from "@/components/inventory/product-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";
import { cn } from "@/lib/cn";

export function CategoriesScreen() {
  const categories = useCategories();
  const [products] = useDemoProducts();
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const parentOf = (c: Category) => categories.find((x) => x.id === c.parentId);
  const usedBy = (c: Category) =>
    products.filter((p) => (c.parentId ? p.subCategory === c.name : p.category === c.name)).length;

  // parents first, each followed by its sub categories
  const ordered = categories
    .filter((c) => c.parentId === null)
    .flatMap((c) => [c, ...categories.filter((s) => s.parentId === c.id)]);
  const orderOf = (c: Category) => ordered.indexOf(c);

  const columns: DataColumn<Category>[] = [
    {
      key: "name",
      label: "Category",
      // sorting by name keeps sub categories under their parent
      sortValue: (c) => orderOf(c),
      text: (c) => (c.parentId ? `-- ${c.name}` : c.name),
      render: (c) =>
        c.parentId ? (
          <span className="flex items-center gap-2 pl-5 text-muted">
            <span className="text-line">└</span>
            <span className="text-foreground">{c.name}</span>
            <span className="rounded bg-surface px-1.5 text-[11px]">in {parentOf(c)?.name}</span>
          </span>
        ) : (
          <span className="font-medium">{c.name}</span>
        ),
    },
    {
      key: "code",
      label: "Category code",
      sortValue: (c) => c.code,
      text: (c) => c.code,
      render: (c) => (c.code ? <span className="font-mono text-xs">{c.code}</span> : <span className="text-muted">-</span>),
    },
    {
      key: "description",
      label: "Description",
      sortValue: (c) => c.description,
      text: (c) => c.description,
      render: (c) => c.description || <span className="text-muted">-</span>,
    },
    {
      key: "products",
      label: "Products",
      sortValue: usedBy,
      text: (c) => String(usedBy(c)),
      render: (c) => <span className="text-muted">{usedBy(c)}</span>,
      align: "right",
    },
  ];

  return (
    <>
      <DataTable
        title="All categories"
        subtitle="Group products for filters, reports and receipts"
        rows={ordered}
        columns={columns}
        rowKey={(c) => c.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="categories"
        exportName="categories"
        minWidth={720}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add category
          </Button>
        }
        actions={(c) => (
          <>
            <RowAction icon="pencil" label={`Edit ${c.name}`} tone="brand" onClick={() => setEditing({ category: c })} />
            <RowAction
              icon="trash"
              label={`Delete ${c.name}`}
              tone="rose"
              onClick={() => {
                const subs = categories.filter((s) => s.parentId === c.id).length;
                const count = usedBy(c);
                if (subs || count) {
                  setBlocked(
                    [
                      count && `${count} product${count === 1 ? " uses" : "s use"} ${c.name}.`,
                      subs && `It has ${subs} sub categor${subs === 1 ? "y" : "ies"}.`,
                      "Move them to another category first, then delete it.",
                    ]
                      .filter(Boolean)
                      .join(" "),
                  );
                  return;
                }
                setConfirm({
                  tone: "danger",
                  confirmLabel: "Delete",
                  message: `The ${c.name} category will be deleted.`,
                  onConfirm: () => updateCategories((prev) => prev.filter((x) => x.id !== c.id)),
                });
              }}
            />
          </>
        )}
      />

      {editing && (
        <CategoryDialog
          key={editing.category?.id ?? "new"}
          category={editing.category}
          all={categories}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            const before = editing.category;
            if (before) {
              updateCategories((prev) => prev.map((c) => (c.id === before.id ? { ...c, ...values } : c)));
              // products refer to categories by name, so a rename carries over
              if (before.name !== values.name)
                updateProducts((prev) =>
                  prev.map((p) =>
                    before.parentId
                      ? p.subCategory === before.name
                        ? { ...p, subCategory: values.name }
                        : p
                      : p.category === before.name
                        ? { ...p, category: values.name }
                        : p,
                  ),
                );
            } else {
              updateCategories((prev) => [...prev, { id: Math.max(0, ...prev.map((c) => c.id)) + 1, ...values }]);
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
          title="Can't delete this category"
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

export function CategoryDialog({
  category,
  all,
  fixedParent,
  onClose,
  onSave,
}: {
  category?: Category;
  all: Category[];
  /** Product form: adding a sub category under a known parent. */
  fixedParent?: Category;
  onClose: () => void;
  onSave: (values: Omit<Category, "id">) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [code, setCode] = useState(category?.code ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [isSub, setIsSub] = useState(Boolean(category?.parentId ?? fixedParent));
  const [parentId, setParentId] = useState(String(category?.parentId ?? fixedParent?.id ?? ""));
  const [errors, setErrors] = useState<{ name?: string; parent?: string }>({});

  // only top-level categories can be parents, and never the category itself
  const parents = all.filter((c) => c.parentId === null && c.id !== category?.id);
  const hasSubs = Boolean(category && all.some((c) => c.parentId === category.id));

  function save() {
    const next: typeof errors = {};
    const parent = isSub ? Number(parentId) || null : null;
    if (!name.trim()) next.name = "Category name is required";
    else if (
      all.some(
        (c) => c.id !== category?.id && c.parentId === parent && c.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      next.name = "A category with this name already exists here";
    if (isSub && !parent) next.parent = "Pick the parent category";
    setErrors(next);
    if (Object.keys(next).length === 0)
      onSave({ name: name.trim(), code: code.trim(), description: description.trim(), parentId: parent });
  }

  return (
    <Modal
      title={category ? "Edit category" : "Add category"}
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {category ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          autoFocus
          label="Category name *"
          placeholder="Category name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />
        <Input
          label="Category code"
          placeholder="Category code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          hint="Category code is the same as the HSN code"
          className="font-mono"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
          />
        </label>

        <label
          className={cn(
            "flex items-center gap-2 text-[13px]",
            hasSubs || fixedParent ? "cursor-not-allowed text-muted" : "cursor-pointer",
          )}
        >
          <input
            type="checkbox"
            checked={isSub}
            // a category with its own sub categories can't become one
            disabled={hasSubs || Boolean(fixedParent)}
            onChange={(event) => setIsSub(event.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Add as sub category
          {hasSubs && <span className="text-xs">(it has sub categories)</span>}
        </label>

        {isSub && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Parent category *</span>
            <select
              value={parentId}
              disabled={Boolean(fixedParent)}
              onChange={(event) => {
                setParentId(event.target.value);
                setErrors((prev) => ({ ...prev, parent: undefined }));
              }}
              className={cn(
                "rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:bg-surface dark:bg-navy-900",
                errors.parent
                  ? "border-red-500 focus:ring-red-500/25"
                  : "border-zinc-300 focus:border-brand-500 focus:ring-brand-500/25 dark:border-navy-700",
              )}
            >
              <option value="">Please select</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.parent && <span className="text-xs text-red-600">{errors.parent}</span>}
          </label>
        )}
      </div>
    </Modal>
  );
}
