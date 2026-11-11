"use client";

/**
 * Sell -> Discounts, as in the old Opal POS: row checkboxes with "Deactivate
 * selected", then Name, Starts at, Ends at, Discount amount, Priority, Brand,
 * Category, Products, Location and Action (Edit, Activate / Deactivate,
 * Delete). Add / Edit open the discount popup.
 */

import { useMemo, useState, type ReactNode } from "react";

import { useBrands } from "@/components/inventory/brands";
import { useCategories } from "@/components/inventory/categories";
import { useDemoProducts } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { usePriceGroups } from "@/components/inventory/price-groups";
import { updateDiscounts, useDiscounts, type Discount } from "@/components/sales/discounts-data";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "-";
const amountText = (d: Discount) => (d.type === "Percentage" ? `${d.amount}%` : USD.format(d.amount));
const dash = <span className="text-muted">-</span>;

export function DiscountsScreen() {
  const discounts = useDiscounts();
  const [products] = useDemoProducts();
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [editing, setEditing] = useState<{ discount?: Discount } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const productNames = (d: Discount) =>
    d.productIds.map((id) => products.find((p) => p.id === id)?.name ?? `#${id}`).join(", ");

  const columns: DataColumn<Discount>[] = [
    {
      key: "name",
      label: "Name",
      sortValue: (d) => d.name,
      text: (d) => d.name,
      render: (d) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium">{d.name}</span>
          {!d.active && <Badge tone="neutral">Inactive</Badge>}
        </span>
      ),
    },
    { key: "starts", label: "Starts at", sortValue: (d) => d.startsAt ?? "", text: (d) => when(d.startsAt) },
    { key: "ends", label: "Ends at", sortValue: (d) => d.endsAt ?? "", text: (d) => when(d.endsAt) },
    {
      key: "amount",
      label: "Discount amount",
      sortValue: (d) => d.amount,
      text: amountText,
      render: (d) => <span className="font-medium tabular-nums">{amountText(d)}</span>,
      align: "right",
    },
    { key: "priority", label: "Priority", sortValue: (d) => d.priority, text: (d) => String(d.priority), align: "right" },
    { key: "brand", label: "Brand", sortValue: (d) => d.brand ?? "", text: (d) => d.brand ?? "", render: (d) => d.brand ?? dash },
    { key: "category", label: "Category", sortValue: (d) => d.category ?? "", text: (d) => d.category ?? "", render: (d) => d.category ?? dash },
    {
      key: "products",
      label: "Products",
      sortValue: productNames,
      text: productNames,
      render: (d) =>
        d.productIds.length ? (
          <span className="block max-w-56 truncate" title={productNames(d)}>
            {productNames(d)}
          </span>
        ) : (
          dash
        ),
    },
    { key: "location", label: "Location", sortValue: (d) => d.location, text: (d) => d.location },
  ];

  const activeSelected = discounts.filter((d) => selected.has(d.id) && d.active);

  return (
    <>
      <DataTable
        title="All your discounts"
        subtitle={`${discounts.filter((d) => d.active).length} active of ${discounts.length} · applied automatically on Add sale`}
        rows={discounts}
        columns={columns}
        rowKey={(d) => d.id}
        defaultSort={{ key: "priority", direction: "desc" }}
        defaultPageSize={100}
        noun="discounts"
        exportName="discounts"
        minWidth={1300}
        selection={{ selected, onChange: setSelected }}
        bulkActions={
          <button
            type="button"
            disabled={activeSelected.length === 0}
            onClick={() =>
              setConfirm({
                tone: "warning",
                confirmLabel: "Deactivate",
                message: `${activeSelected.length} discount${activeSelected.length === 1 ? "" : "s"} will stop applying to sales.`,
                onConfirm: () => {
                  updateDiscounts((prev) => prev.map((d) => (selected.has(d.id) ? { ...d, active: false } : d)));
                  setSelected(new Set());
                },
              })
            }
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deactivate selected
          </button>
        }
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Button>
        }
        actions={(d) => (
          <ActionsMenu
            label={`Actions for ${d.name}`}
            actions={[
              { label: "Edit", icon: "pencil", onClick: () => setEditing({ discount: d }) },
              {
                label: d.active ? "Deactivate" : "Activate",
                icon: d.active ? "eye-off" : "eye",
                onClick: () =>
                  setConfirm({
                    tone: d.active ? "warning" : "success",
                    confirmLabel: d.active ? "Deactivate" : "Activate",
                    message: d.active ? `${d.name} will stop applying to sales.` : `${d.name} will apply to matching sales again.`,
                    onConfirm: () => updateDiscounts((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x))),
                  }),
              },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `The ${d.name} discount will be deleted.`,
                    onConfirm: () => updateDiscounts((prev) => prev.filter((x) => x.id !== d.id)),
                  }),
              },
            ]}
          />
        )}
      />

      {editing && (
        <DiscountDialog
          key={editing.discount?.id ?? "new"}
          discount={editing.discount}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            const before = editing.discount;
            updateDiscounts((prev) =>
              before
                ? prev.map((d) => (d.id === before.id ? { ...d, ...values } : d))
                : [...prev, { id: Math.max(0, ...prev.map((d) => d.id)) + 1, ...values }],
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
    </>
  );
}

// ---------- add / edit ----------

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface disabled:text-muted dark:border-navy-700 dark:bg-navy-900";

function DiscountDialog({
  discount,
  onClose,
  onSave,
}: {
  discount?: Discount;
  onClose: () => void;
  onSave: (values: Omit<Discount, "id">) => void;
}) {
  const [products] = useDemoProducts();
  const brands = useBrands();
  const categories = useCategories();
  const groups = usePriceGroups();

  const [name, setName] = useState(discount?.name ?? "");
  const [productIds, setProductIds] = useState<number[]>(discount?.productIds ?? []);
  const [productSearch, setProductSearch] = useState("");
  const [brand, setBrand] = useState(discount?.brand ?? "");
  const [category, setCategory] = useState(discount?.category ?? "");
  const [location, setLocation] = useState(discount?.location ?? "");
  const [priority, setPriority] = useState(String(discount?.priority ?? ""));
  const [type, setType] = useState<Discount["type"] | "">(discount?.type ?? "");
  const [amount, setAmount] = useState(discount ? String(discount.amount) : "");
  const [startsAt, setStartsAt] = useState(discount?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(discount?.endsAt ?? "");
  const [priceGroupId, setPriceGroupId] = useState(discount?.priceGroupId ? String(discount.priceGroupId) : "");
  const [applyInCustomerGroups, setApplyInCustomerGroups] = useState(discount?.applyInCustomerGroups ?? false);
  const [active, setActive] = useState(discount?.active ?? true);
  // errors show after the first Save and then follow the fields as they change
  const [tried, setTried] = useState(false);

  const productMatches = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return term ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term) && !productIds.includes(p.id)).slice(0, 6) : [];
  }, [productSearch, products, productIds]);

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!location) next.location = "Pick a location";
    if (!type) next.type = "Pick a discount type";
    if (!(Number(amount) > 0)) next.amount = "Enter an amount above zero";
    else if (type === "Percentage" && Number(amount) > 100) next.amount = "A percentage can't be over 100";
    if (startsAt && endsAt && endsAt < startsAt) next.endsAt = "Ends before it starts";
    if (productIds.length === 0 && !brand && !category) next.target = "Pick products, a brand or a category";
    return next;
  }
  const errors = tried ? validate() : {};

  function save() {
    setTried(true);
    if (Object.keys(validate()).length) return;
    onSave({
      name: name.trim(),
      productIds,
      brand: brand || null,
      category: category || null,
      location,
      priority: Number(priority) || 0,
      type: type as Discount["type"],
      amount: Number(amount),
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      priceGroupId: priceGroupId ? Number(priceGroupId) : null,
      applyInCustomerGroups,
      active,
    });
  }

  return (
    <Modal
      title={discount ? "Edit discount" : "Add discount"}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {discount ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      {errors.target && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          {errors.target}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name}>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className={cn(inputClass, errors.name && "border-red-500")} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Products</span>
          <div className="relative">
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products for this discount"
              className={inputClass}
            />
            {productMatches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-line bg-background p-1 shadow-lg shadow-navy-950/10">
                {productMatches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setProductIds((prev) => [...prev, p.id]);
                        setProductSearch("");
                      }}
                      className="flex w-full justify-between rounded-md px-3 py-1.5 text-left text-[13px] hover:bg-surface"
                    >
                      {p.name} <span className="font-mono text-xs text-muted">{p.sku}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {productIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {productIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-100">
                  {products.find((p) => p.id === id)?.name ?? `#${id}`}
                  <button
                    type="button"
                    aria-label={`Remove ${products.find((p) => p.id === id)?.name}`}
                    onClick={() => setProductIds((prev) => prev.filter((x) => x !== id))}
                    className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-800"
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Field label="Brand">
          <select value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass}>
            <option value="">Please select</option>
            {brands.map((b) => (
              <option key={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
            <option value="">Please select</option>
            {categories.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Location *" error={errors.location}>
          <select value={location} onChange={(event) => setLocation(event.target.value)} className={cn(inputClass, errors.location && "border-red-500")}>
            <option value="">Please select</option>
            {PRODUCT_LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority" hint="Higher wins when several discounts match">
          <input value={priority} onChange={(event) => setPriority(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Priority" className={inputClass} />
        </Field>
        <Field label="Discount type *" error={errors.type}>
          <select value={type} onChange={(event) => setType(event.target.value as Discount["type"])} className={cn(inputClass, errors.type && "border-red-500")}>
            <option value="">Please select</option>
            <option>Fixed</option>
            <option>Percentage</option>
          </select>
        </Field>
        <Field label="Discount amount *" error={errors.amount}>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder={type === "Percentage" ? "e.g. 10 (%)" : "e.g. 2.50"}
            className={cn(inputClass, errors.amount && "border-red-500")}
          />
        </Field>
        <Field label="Starts at">
          <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Ends at" error={errors.endsAt}>
          <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={cn(inputClass, errors.endsAt && "border-red-500")} />
        </Field>
        <Field label="Selling price group">
          <select value={priceGroupId} onChange={(event) => setPriceGroupId(event.target.value)} className={inputClass}>
            <option value="">All</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1 text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={applyInCustomerGroups} onChange={(event) => setApplyInCustomerGroups(event.target.checked)} className="h-4 w-4 accent-brand-500" />
            Apply in customer groups
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-brand-500" />
            Is active
          </label>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
