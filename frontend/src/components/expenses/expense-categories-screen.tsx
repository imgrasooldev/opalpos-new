"use client";

/**
 * Expenses -> Expense categories, as in the old Opal POS: category name and
 * code, with Add / Edit in a popup ("Add as sub-category" picks a parent)
 * and Delete behind "Are you sure?". A category still used by expenses or
 * with sub categories can't be deleted.
 */

import { useState } from "react";

import {
  updateExpenseCategories,
  useExpenseCategories,
  useExpenses,
  type ExpenseCategory,
} from "@/components/expenses/expenses-data";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowAction } from "@/components/ui/table-controls";
import { cn } from "@/lib/cn";

export function ExpenseCategoriesScreen() {
  const categories = useExpenseCategories();
  const expenses = useExpenses();
  const [editing, setEditing] = useState<{ category?: ExpenseCategory } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const parentOf = (c: ExpenseCategory) => categories.find((x) => x.id === c.parentId);
  const usedBy = (c: ExpenseCategory) => expenses.filter((e) => e.categoryId === c.id || e.subCategoryId === c.id).length;

  // parents first, each followed by its sub categories
  const ordered = categories
    .filter((c) => c.parentId === null)
    .flatMap((c) => [c, ...categories.filter((s) => s.parentId === c.id)]);
  const orderOf = (c: ExpenseCategory) => ordered.indexOf(c);

  const columns: DataColumn<ExpenseCategory>[] = [
    {
      key: "name",
      label: "Category name",
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
      render: (c) => (c.code ? <span className="font-mono text-xs">{c.code}</span> : <span className="text-muted">—</span>),
    },
  ];

  return (
    <>
      <DataTable
        title="All your expense categories"
        subtitle={`${categories.length} categories · sub categories are listed under their parent`}
        rows={ordered}
        columns={columns}
        rowKey={(c) => c.id}
        defaultSort={{ key: "name", direction: "asc" }}
        defaultPageSize={100}
        noun="categories"
        exportName="expense-categories"
        minWidth={600}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add
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
                      count && `${count} expense${count === 1 ? " uses" : "s use"} ${c.name}.`,
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
                  message: `The ${c.name} expense category will be deleted.`,
                  onConfirm: () => updateExpenseCategories((prev) => prev.filter((x) => x.id !== c.id)),
                });
              }}
            />
          </>
        )}
      />

      {editing && (
        <ExpenseCategoryDialog
          key={editing.category?.id ?? "new"}
          category={editing.category}
          all={categories}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            const before = editing.category;
            if (before) updateExpenseCategories((prev) => prev.map((c) => (c.id === before.id ? { ...c, ...values } : c)));
            else updateExpenseCategories((prev) => [...prev, { id: Math.max(0, ...prev.map((c) => c.id)) + 1, ...values }]);
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

function ExpenseCategoryDialog({
  category,
  all,
  onClose,
  onSave,
}: {
  category?: ExpenseCategory;
  all: ExpenseCategory[];
  onClose: () => void;
  onSave: (values: Omit<ExpenseCategory, "id">) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [code, setCode] = useState(category?.code ?? "");
  const [isSub, setIsSub] = useState(Boolean(category?.parentId));
  const [parentId, setParentId] = useState(String(category?.parentId ?? ""));
  const [errors, setErrors] = useState<{ name?: string; code?: string; parent?: string }>({});

  // only top-level categories can be parents, and never the category itself
  const parents = all.filter((c) => c.parentId === null && c.id !== category?.id);
  const hasSubs = Boolean(category && all.some((c) => c.parentId === category.id));

  function save() {
    const next: typeof errors = {};
    const parent = isSub ? Number(parentId) || null : null;
    if (!name.trim()) next.name = "Category name is required";
    else if (all.some((c) => c.id !== category?.id && c.parentId === parent && c.name.toLowerCase() === name.trim().toLowerCase()))
      next.name = "A category with this name already exists here";
    if (code.trim() && all.some((c) => c.id !== category?.id && c.code.toLowerCase() === code.trim().toLowerCase()))
      next.code = "This code is already used";
    if (isSub && !parent) next.parent = "Pick the parent category";
    setErrors(next);
    if (Object.keys(next).length === 0) onSave({ name: name.trim(), code: code.trim(), parentId: parent });
  }

  return (
    <Modal
      title={category ? "Edit expense category" : "Add expense category"}
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
          onChange={(event) => {
            setCode(event.target.value);
            setErrors((prev) => ({ ...prev, code: undefined }));
          }}
          error={errors.code}
          className="font-mono"
        />

        <label className={cn("flex items-center gap-2 text-[13px]", hasSubs ? "cursor-not-allowed text-muted" : "cursor-pointer")}>
          <input
            type="checkbox"
            checked={isSub}
            // a category with its own sub categories can't become one
            disabled={hasSubs}
            onChange={(event) => setIsSub(event.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Add as sub-category
          {hasSubs && <span className="text-xs">(it has sub categories)</span>}
        </label>

        {isSub && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Parent category *</span>
            <select
              aria-label="Parent category"
              value={parentId}
              onChange={(event) => {
                setParentId(event.target.value);
                setErrors((prev) => ({ ...prev, parent: undefined }));
              }}
              className={cn(
                "rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 dark:bg-navy-900",
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
