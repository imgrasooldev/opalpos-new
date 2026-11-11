"use client";

/**
 * "All users" card — the users' columns and row actions on top of the shared
 * DataTable (toolbar, sort, search, column picker, pagination).
 */

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { RowAction } from "@/components/ui/table-controls";
import { ROLE_TONE, type DemoUser } from "@/components/users/users-data";

const COLUMNS: DataColumn<DemoUser>[] = [
  {
    key: "username",
    label: "Username",
    sortValue: (u) => u.username ?? "",
    text: (u) => u.username ?? (u.pin ? `PIN: ${u.pin}` : ""),
    render: (u) =>
      u.username ? (
        <span className="font-medium">{u.username}</span>
      ) : (
        // cashier: no username, show the POS PIN instead
        <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px]">
          PIN {u.pin}
        </span>
      ),
  },
  {
    key: "name",
    label: "Name",
    sortValue: (u) => u.name,
    text: (u) => u.name,
    render: (u) => (
      <span className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
          {initials(u.name)}
        </span>
        {u.name}
      </span>
    ),
  },
  {
    key: "role",
    label: "Role",
    sortValue: (u) => u.role,
    text: (u) => u.role,
    render: (u) => <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>,
  },
  {
    key: "email",
    label: "Email",
    sortValue: (u) => u.email,
    text: (u) => u.email,
    render: (u) => <span className="text-muted">{u.email}</span>,
  },
  {
    key: "commission",
    label: "Commission (%)",
    sortValue: (u) => u.commission,
    text: (u) => u.commission.toFixed(2),
    render: (u) => `${u.commission.toFixed(2)}%`,
    align: "right",
  },
  {
    key: "assignedAdmin",
    label: "Assigned admin",
    sortValue: (u) => u.assignedAdmin ?? "",
    text: (u) => u.assignedAdmin ?? "",
    render: (u) =>
      u.assignedAdmin ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-xs">
          <Icon name="store" className="h-3.5 w-3.5 text-muted" />
          {u.assignedAdmin}
        </span>
      ) : (
        <span className="text-muted">-</span>
      ),
  },
];

export function UsersTable({ users }: { users: DemoUser[] }) {
  return (
    <DataTable
      title="All users"
      subtitle={`${users.length} people can sign in to this business`}
      rows={users}
      columns={COLUMNS}
      rowKey={(u) => u.id}
      noun="users"
      exportName="users"
      actions={(u) => (
        <>
          <RowAction
            icon="pencil"
            label={`Edit ${u.name}`}
            tone="brand"
            href={`/users/${u.id}/edit`}
          />
          <RowAction icon="eye" label={`View ${u.name}`} tone="aqua" href={`/users/${u.id}`} />
          <RowAction icon="trash" label={`Delete ${u.name}`} tone="rose" />
        </>
      )}
    />
  );
}

function initials(name: string) {
  return name
    .replace(/^Mr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
