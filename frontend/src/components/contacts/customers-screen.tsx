"use client";

/**
 * Customers list: the Filters card (same filters as the old Opal POS screen)
 * above the shared DataTable. Filters narrow the rows before the table's own
 * search/sort/paging; with the API they become query params.
 */

import { useMemo, useState } from "react";

import {
  ASSIGNABLE_USERS,
  CUSTOMER_GROUPS,
  DEMO_TODAY,
  type DemoCustomer,
} from "@/components/contacts/customers-data";
import { CustomerDialog } from "@/components/contacts/customer-dialog";
import { PaymentDialog } from "@/components/contacts/payment-dialog";
import { nextContactId, updateCustomers, useCustomers } from "@/components/contacts/customer-store";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function money(value: number) {
  return USD.format(value);
}

/** Due amounts: negative (customer overpaid) in red, zero muted. */
function Due({ value }: { value: number }) {
  return (
    <span className={cn(value < 0 && "text-rose-600", value === 0 && "text-muted")}>
      {money(value)}
    </span>
  );
}

// UTC so the server and the browser print the same date
const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const sum = (rows: DemoCustomer[], pick: (c: DemoCustomer) => number) =>
  rows.reduce((total, c) => total + pick(c), 0);

const dash = <span className="text-muted">-</span>;

const COLUMNS: DataColumn<DemoCustomer>[] = [
  {
    key: "contactId",
    label: "Contact ID",
    sortValue: (c) => c.contactId,
    text: (c) => c.contactId,
    render: (c) => <span className="font-mono text-xs">{c.contactId}</span>,
  },
  {
    key: "businessName",
    label: "Business name",
    sortValue: (c) => c.businessName ?? "",
    text: (c) => c.businessName ?? "",
    render: (c) => c.businessName ?? dash,
  },
  {
    key: "name",
    label: "Name",
    sortValue: (c) => c.name,
    text: (c) => c.name,
    render: (c) => (
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
            c.active ? "bg-brand-gradient" : "bg-zinc-400",
          )}
        >
          {initials(c.name)}
        </span>
        <span className="leading-tight">
          <span className={cn("block font-medium", !c.active && "text-muted")}>{c.name}</span>
          {/* shown under the name, like the old screen */}
          {!c.active && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
              <Icon name="eye-off" className="h-3 w-3" />
              Deactivated
            </span>
          )}
        </span>
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    sortValue: (c) => c.email ?? "",
    text: (c) => c.email ?? "",
    render: (c) => (c.email ? <span className="text-muted">{c.email}</span> : dash),
  },
  {
    key: "taxNumber",
    label: "Tax number",
    sortValue: (c) => c.taxNumber ?? "",
    text: (c) => c.taxNumber ?? "",
    render: (c) => c.taxNumber ?? dash,
  },
  {
    key: "creditLimit",
    label: "Credit limit",
    sortValue: (c) => c.creditLimit ?? -1,
    text: (c) => (c.creditLimit === null ? "" : c.creditLimit.toFixed(2)),
    // the old screen shows $0.00 when no limit is set
    render: (c) => <Due value={c.creditLimit ?? 0} />,
    align: "right",
  },
  {
    key: "payTerm",
    label: "Pay term",
    sortValue: (c) => c.payTerm ?? "",
    text: (c) => c.payTerm ?? "",
    render: (c) => c.payTerm ?? dash,
  },
  {
    key: "openingBalance",
    label: "Opening balance",
    sortValue: (c) => c.openingBalance,
    text: (c) => c.openingBalance.toFixed(2),
    render: (c) => <Due value={c.openingBalance} />,
    align: "right",
  },
  {
    key: "advanceBalance",
    label: "Advance balance",
    sortValue: (c) => c.advanceBalance,
    text: (c) => c.advanceBalance.toFixed(2),
    render: (c) => <Due value={c.advanceBalance} />,
    align: "right",
  },
  {
    key: "addedOn",
    label: "Added on",
    sortValue: (c) => c.addedOn,
    text: (c) => DATE.format(new Date(c.addedOn)),
    render: (c) => <span className="text-muted">{DATE.format(new Date(c.addedOn))}</span>,
  },
  {
    key: "opalPoints",
    label: "Opal points",
    sortValue: (c) => c.opalPoints,
    text: (c) => String(c.opalPoints),
    render: (c) =>
      c.opalPoints > 0 ? (
        <span className="font-medium text-plum-600">{c.opalPoints}</span>
      ) : (
        <span className="text-muted">0</span>
      ),
    align: "right",
  },
  {
    key: "group",
    label: "Customer group",
    sortValue: (c) => c.group ?? "",
    text: (c) => c.group ?? "",
    render: (c) => (c.group ? <Badge tone="blue">{c.group}</Badge> : dash),
  },
  {
    key: "address",
    label: "Address",
    sortValue: (c) => c.address ?? "",
    text: (c) => c.address ?? "",
    render: (c) => c.address ?? dash,
  },
  {
    key: "mobile",
    label: "Mobile",
    sortValue: (c) => c.mobile ?? "",
    text: (c) => c.mobile ?? "",
    render: (c) => (c.mobile ? <span className="tabular-nums">{c.mobile}</span> : dash),
  },
  {
    key: "saleDue",
    label: "Total sale due",
    sortValue: (c) => c.saleDue,
    text: (c) => c.saleDue.toFixed(2),
    render: (c) => <Due value={c.saleDue} />,
    align: "right",
    total: (rows) => <Due value={sum(rows, (c) => c.saleDue)} />,
  },
  {
    key: "sellReturnDue",
    label: "Total sell return due",
    sortValue: (c) => c.sellReturnDue,
    text: (c) => c.sellReturnDue.toFixed(2),
    render: (c) => <Due value={c.sellReturnDue} />,
    align: "right",
    total: (rows) => <Due value={sum(rows, (c) => c.sellReturnDue)} />,
  },
  ...[0, 1, 2, 3, 4].map(
    (i): DataColumn<DemoCustomer> => ({
      key: `custom${i + 1}`,
      label: `Custom field ${i + 1}`,
      sortValue: (c) => c.customFields[i] ?? "",
      text: (c) => c.customFields[i] ?? "",
      render: (c) => c.customFields[i] ?? dash,
    }),
  ),
];

type Filters = {
  sellDue: boolean;
  sellReturn: boolean;
  advance: boolean;
  opening: boolean;
  /** Months without a sale; "" = any. */
  noSellFrom: string;
  group: string;
  assignedTo: string;
  status: string;
};

const NO_FILTERS: Filters = {
  sellDue: false,
  sellReturn: false,
  advance: false,
  opening: false,
  noSellFrom: "",
  group: "",
  assignedTo: "",
  status: "",
};

const TOGGLES: { key: "sellDue" | "sellReturn" | "advance" | "opening"; label: string }[] = [
  { key: "sellDue", label: "Sell due" },
  { key: "sellReturn", label: "Sell return" },
  { key: "advance", label: "Advance balance" },
  { key: "opening", label: "Opening balance" },
];

/** True when the customer hasn't bought anything in the last `months` months. */
function noSaleSince(c: DemoCustomer, months: number) {
  if (!c.lastSaleOn) return true;
  const cutoff = new Date(DEMO_TODAY);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return new Date(c.lastSaleOn) < cutoff;
}

export function CustomersScreen() {
  // shared demo store, so customers added from a sale show up here too
  const customers = useCustomers();
  const setCustomers = updateCustomers;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [dialog, setDialog] = useState<{ customer?: DemoCustomer } | null>(null);
  const [paying, setPaying] = useState<DemoCustomer | null>(null);

  /** A payment lowers the due; paying more than owed leaves it negative (overpaid). */
  function toggleActive(customer: DemoCustomer) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, active: !c.active } : c)),
    );
  }

  function recordPayment(customer: DemoCustomer, amount: number) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? { ...c, saleDue: Math.round((c.saleDue - amount) * 100) / 100 }
          : c,
      ),
    );
    setPaying(null);
  }

  function save(customer: DemoCustomer) {
    setCustomers((prev) => {
      const saved = { ...customer, contactId: customer.contactId || nextContactId(prev) };
      return prev.some((c) => c.id === saved.id)
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev];
    });
    setDialog(null);
  }

  const active = Object.entries(filters).filter(([key, value]) => value !== NO_FILTERS[key as keyof Filters]).length;

  const rows = useMemo(
    () =>
      customers.filter(
        (c) =>
          (!filters.sellDue || c.saleDue > 0) &&
          (!filters.sellReturn || c.sellReturnDue > 0) &&
          (!filters.advance || c.advanceBalance > 0) &&
          (!filters.opening || c.openingBalance > 0) &&
          (!filters.noSellFrom || noSaleSince(c, Number(filters.noSellFrom))) &&
          (!filters.group || c.group === filters.group) &&
          (!filters.assignedTo || c.assignedTo === Number(filters.assignedTo)) &&
          (!filters.status || c.active === (filters.status === "active")),
      ),
    [customers, filters],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
            {active > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">
                {active}
              </span>
            )}
          </h2>
        }
        action={
          active > 0 && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="flex flex-wrap gap-2">
          {TOGGLES.map((toggle) => {
            const on = filters[toggle.key];
            return (
              <label
                key={toggle.key}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                  on
                    ? "border-brand-500 bg-brand-50 font-medium text-brand-600 dark:bg-brand-900 dark:text-brand-200"
                    : "border-line text-muted hover:text-foreground",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(event) => set(toggle.key, event.target.checked)}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
                {toggle.label}
              </label>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Has no sell from"
            value={filters.noSellFrom}
            onChange={(v) => set("noSellFrom", v)}
            options={[
              { value: "", label: "Any time" },
              { value: "1", label: "One month" },
              { value: "3", label: "Three months" },
              { value: "6", label: "Six months" },
              { value: "12", label: "One year" },
            ]}
          />
          <FilterSelect
            label="Customer group"
            value={filters.group}
            onChange={(v) => set("group", v)}
            options={[
              { value: "", label: "All groups" },
              ...CUSTOMER_GROUPS.map((g) => ({ value: g, label: g })),
            ]}
          />
          <FilterSelect
            label="Assigned to"
            value={filters.assignedTo}
            onChange={(v) => set("assignedTo", v)}
            options={[
              { value: "", label: "Anyone" },
              ...ASSIGNABLE_USERS.map((u) => ({ value: String(u.id), label: u.name })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
      </Card>

      <DataTable
        title="All your customers"
        subtitle={
          active > 0
            ? `${rows.length} of ${customers.length} customers match the filters`
            : `${customers.length} customers`
        }
        rows={rows}
        columns={COLUMNS}
        rowKey={(c) => c.id}
        // same as the old screen: Contact ID descending puts Walk-In (CO0001) first
        defaultSort={{ key: "contactId", direction: "desc" }}
        defaultPageSize={100}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setDialog({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add customer
          </Button>
        }
        noun="customers"
        exportName="customers"
        minWidth={2000}
        actionsPosition="start"
        actions={(c) => (
          <ActionsMenu
            label={`Actions for ${c.name}`}
            actions={[
              { label: "Pay", icon: "dollar", onClick: () => setPaying(c) },
              { label: "View", icon: "eye", href: `/contacts/customers/${c.id}` },
              { label: "Edit", icon: "pencil", onClick: () => setDialog({ customer: c }) },
              { label: "Ledger", icon: "receipt", href: `/contacts/customers/${c.id}?tab=ledger` },
              { label: "Sales", icon: "tag", href: `/contacts/customers/${c.id}?tab=sales` },
              {
                label: c.active ? "Deactivate" : "Activate",
                icon: c.active ? "eye-off" : "eye",
                onClick: () => toggleActive(c),
              },
              { label: "Delete", icon: "trash", danger: true, dividerBefore: true },
            ]}
          />
        )}
      />

      {paying && (
        <PaymentDialog
          customer={paying}
          onClose={() => setPaying(null)}
          onSave={(amount) => recordPayment(paying, amount)}
        />
      )}

      {dialog && (
        <CustomerDialog
          // a fresh form for each contact (and for Add)
          key={dialog.customer?.id ?? "new"}
          customer={dialog.customer}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-9 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
            value ? "border-brand-500/60" : "border-line",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}

function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
