"use client";

/**
 * "All roles" card: entries picker, search, a sortable Role column, and
 * Edit/Delete per row. Admin is a system role, so it has no actions — the same
 * as the old Opal POS screen.
 *
 * Search, sort and paging run client-side on demo data for now.
 */

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  PageSizeSelect,
  RowAction,
  TableFooter,
  TableSearch,
} from "@/components/ui/table-controls";
import type { DemoRole } from "@/components/roles/roles-data";
import { cn } from "@/lib/cn";

export function RolesTable({ roles }: { roles: DemoRole[] }) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [ascending, setAscending] = useState(true);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? roles.filter((role) =>
          `${role.name} ${role.description}`.toLowerCase().includes(term),
        )
      : roles;

    return [...matched].sort((a, b) =>
      ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
  }, [roles, search, ascending]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <Card
      title={
        <div>
          <h2 className="text-sm font-semibold">All roles</h2>
          <p className="mt-0.5 text-xs text-muted">
            A role decides what its users can see and do
          </p>
        </div>
      }
      bodyClassName="px-0 pb-0"
    >
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
        <PageSizeSelect
          value={pageSize}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
        <TableSearch
          label="Search roles"
          placeholder="Search roles..."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      {/* on small screens the table scrolls inside its container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-line bg-surface/60 text-xs text-muted">
              <th
                scope="col"
                aria-sort={ascending ? "ascending" : "descending"}
                className="px-5 py-2.5 font-medium"
              >
                <button
                  type="button"
                  onClick={() => setAscending((v) => !v)}
                  className="inline-flex items-center gap-1 text-foreground transition-colors"
                >
                  Role
                  <Icon
                    name="chevron-down"
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      ascending && "rotate-180",
                    )}
                  />
                </button>
              </th>
              <th scope="col" className="px-5 py-2.5 font-medium">
                Users
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {pageRows.map((role) => (
              <tr
                key={role.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        role.system
                          ? "bg-brand-50 text-brand-500 dark:bg-brand-900"
                          : "bg-surface text-muted",
                      )}
                    >
                      <Icon name={role.system ? "lock" : "users"} className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        {role.name}
                        {role.system && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-600 dark:bg-brand-900 dark:text-brand-200">
                            System
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{role.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 tabular-nums text-muted">
                  {role.users} {role.users === 1 ? "user" : "users"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <RowAction
                      icon="eye"
                      label={`View ${role.name}`}
                      tone="aqua"
                      href={`/roles/${role.id}`}
                    />
                    {role.system ? (
                      // system roles can be viewed, never changed
                      <span
                        title="System role, can't be changed"
                        className="rounded-lg p-1.5 text-muted"
                      >
                        <Icon name="lock" className="h-4 w-4" />
                      </span>
                    ) : (
                      <>
                        <RowAction
                          icon="pencil"
                          label={`Edit ${role.name}`}
                          tone="brand"
                          href={`/roles/${role.id}/edit`}
                        />
                        <RowAction icon="trash" label={`Delete ${role.name}`} tone="rose" />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-muted">
                  No roles match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TableFooter
        start={start}
        shown={pageRows.length}
        total={rows.length}
        unfiltered={roles.length}
        page={current}
        pages={pages}
        onPageChange={setPage}
      />
    </Card>
  );
}
