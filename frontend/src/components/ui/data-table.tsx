"use client";

/**
 * Generic list card used by the list screens (Users, Customers, ...):
 * toolbar (entries, CSV/Excel/PDF/Print, column picker, search), a sortable
 * table, an optional totals row, and pagination.
 *
 * Each screen only describes its columns and row actions. Search, sort, page
 * size and column visibility run client-side on the rows given; with the API
 * this state becomes query params (q, sort, page, size) and the backend does
 * the filtering — the markup stays the same.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  PageSizeSelect,
  TableFooter,
  TableSearch,
} from "@/components/ui/table-controls";
import { cn } from "@/lib/cn";

export type DataColumn<T> = {
  key: string;
  label: string;
  sortValue: (row: T) => string | number;
  /** Plain text for search and CSV export. */
  text: (row: T) => string;
  /** Cell content; defaults to `text`. */
  render?: (row: T) => ReactNode;
  align?: "right";
  /** Starts hidden; can be turned on from the Columns menu. */
  defaultHidden?: boolean;
  /** Value for the totals row, computed over all filtered rows (not just this page). */
  total?: (rows: T[]) => ReactNode;
};

type Sort = { key: string; direction: "asc" | "desc" };

type Props<T> = {
  title: string;
  subtitle?: ReactNode;
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string | number;
  /** Row actions; the Action column stays pinned so it never scrolls away. */
  actions?: (row: T) => ReactNode;
  /** "start" puts Action first (old Opal POS customers), "end" last. */
  actionsPosition?: "start" | "end";
  defaultSort?: Sort;
  /** Noun for the search box and empty state, e.g. "users". */
  noun: string;
  /** File name for the CSV export, without extension. */
  exportName: string;
  /** Minimum table width before it scrolls sideways. */
  minWidth?: number;
  defaultPageSize?: number;
  /** Button(s) in the card header, e.g. "Add customer". */
  headerAction?: ReactNode;
  /** Row checkboxes; the parent owns the selected keys. */
  selection?: {
    selected: Set<string | number>;
    onChange: (selected: Set<string | number>) => void;
  };
  /** Buttons that act on the selected rows, shown in a bar above the table. */
  bulkActions?: ReactNode;
  /** Extra classes per row, e.g. to highlight out-of-stock items. */
  rowClassName?: (row: T) => string | undefined;
};

export function DataTable<T>({
  title,
  subtitle,
  rows: allRows,
  columns,
  rowKey,
  actions,
  actionsPosition = "end",
  defaultSort,
  noun,
  exportName,
  minWidth = 860,
  defaultPageSize = 10,
  headerAction,
  selection,
  bulkActions,
  rowClassName,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<Sort>(
    defaultSort ?? { key: columns[0].key, direction: "asc" },
  );
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );

  const visibleColumns = columns.filter((column) => !hidden.has(column.key));
  const hasTotals = visibleColumns.some((c) => c.total);
  const actionsFirst = Boolean(actions) && actionsPosition === "start";
  const actionsLast = Boolean(actions) && actionsPosition === "end";

  // the pinned Action column, on whichever edge it lives
  const pinned = actionsFirst
    ? "sticky left-0 shadow-[8px_0_12px_-12px_rgb(0_0_0_/_0.25)]"
    : "sticky right-0 shadow-[-8px_0_12px_-12px_rgb(0_0_0_/_0.25)]";
  const actionHead = (
    <th
      scope="col"
      className={cn(pinned, "bg-surface px-5 py-2.5 font-medium", actionsLast && "text-right")}
    >
      Action
    </th>
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const column = columns.find((c) => c.key === sort.key) ?? columns[0];

    const matched = term
      ? allRows.filter((row) =>
          columns.some((c) => c.text(row).toLowerCase().includes(term)),
        )
      : allRows;

    return [...matched].sort((a, b) => {
      const x = column.sortValue(a);
      const y = column.sortValue(b);
      const order =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y));
      return sort.direction === "asc" ? order : -order;
    });
  }, [allRows, columns, search, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  // the header checkbox works on the rows of the current page
  const pageKeys = pageRows.map(rowKey);
  const pageSelected = selection ? pageKeys.filter((k) => selection.selected.has(k)).length : 0;
  function togglePage() {
    if (!selection) return;
    const next = new Set(selection.selected);
    const selectAll = pageSelected < pageKeys.length;
    for (const key of pageKeys) {
      if (selectAll) next.add(key);
      else next.delete(key);
    }
    selection.onChange(next);
  }
  function toggleRow(key: string | number) {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  }
  const extraCols = (selection ? 1 : 0) + (actions ? 1 : 0);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  function exportCsv() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [
      visibleColumns.map((c) => escape(c.label)).join(","),
      ...rows.map((row) => visibleColumns.map((c) => escape(c.text(row))).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card
      title={
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      }
      action={headerAction}
      bodyClassName="px-0 pb-0"
    >
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
        <PageSizeSelect
          value={pageSize}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        <div className="flex flex-wrap items-center rounded-lg border border-line bg-background p-0.5 shadow-sm shadow-navy-950/[0.03]">
          <ToolbarButton icon="download" label="CSV" onClick={exportCsv} />
          {/* Excel/PDF need a library — placeholders for now */}
          <ToolbarButton icon="download" label="Excel" />
          <ToolbarButton icon="download" label="PDF" />
          <ToolbarButton icon="printer" label="Print" onClick={() => window.print()} />
          <ColumnMenu
            columns={columns}
            hidden={hidden}
            onToggle={(key) =>
              setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
          />
        </div>

        <TableSearch
          label={`Search ${noun}`}
          placeholder={`Search ${noun}...`}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      {bulkActions && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/50 px-5 py-2.5">
          <span className="mr-1 text-[12.5px] text-muted">
            {selection && selection.selected.size > 0
              ? `${selection.selected.size} selected`
              : "Select rows to"}
          </span>
          {bulkActions}
        </div>
      )}

      {/* on small screens the table scrolls inside its container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]" style={{ minWidth }}>
          <thead>
            <tr className="border-y border-line bg-surface text-xs text-muted">
              {selection && (
                <th scope="col" className="w-10 bg-surface py-2.5 pl-5 pr-0">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={pageKeys.length > 0 && pageSelected === pageKeys.length}
                    ref={(el) => {
                      if (el) el.indeterminate = pageSelected > 0 && pageSelected < pageKeys.length;
                    }}
                    onChange={togglePage}
                    className="h-4 w-4 accent-brand-500"
                  />
                </th>
              )}
              {actionsFirst && actionHead}
              {visibleColumns.map((column) => {
                const active = sort.key === column.key;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap px-5 py-2.5 font-medium",
                      column.align === "right" && "text-right",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        active && "text-foreground",
                      )}
                    >
                      {column.label}
                      <Icon
                        name={active ? "chevron-down" : "sort"}
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          !active && "opacity-40",
                          active && sort.direction === "asc" && "rotate-180",
                        )}
                      />
                    </button>
                  </th>
                );
              })}
              {actionsLast && actionHead}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "group border-b border-line transition-colors last:border-0 hover:bg-surface",
                  selection?.selected.has(rowKey(row)) && "bg-brand-50/60 dark:bg-brand-900/30",
                  rowClassName?.(row),
                )}
              >
                {selection && (
                  <td className="py-3 pl-5 pr-0">
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selection.selected.has(rowKey(row))}
                      onChange={() => toggleRow(rowKey(row))}
                      className="h-4 w-4 accent-brand-500"
                    />
                  </td>
                )}
                {actionsFirst && (
                  <td className={cn(pinned, "bg-background px-5 py-3 transition-colors group-hover:bg-surface")}>
                    <div className="flex gap-1.5">{actions!(row)}</div>
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-5 py-3",
                      column.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {column.render ? column.render(row) : column.text(row)}
                  </td>
                ))}
                {actionsLast && (
                  // pinned, so actions stay reachable on wide tables
                  <td className={cn(pinned, "bg-background px-5 py-3 transition-colors group-hover:bg-surface")}>
                    <div className="flex justify-end gap-1.5">{actions!(row)}</div>
                  </td>
                )}
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + extraCols}
                  className="px-5 py-12 text-center text-muted"
                >
                  {search ? <>No {noun} match &ldquo;{search}&rdquo;.</> : <>No {noun} to show.</>}
                </td>
              </tr>
            )}
          </tbody>

          {hasTotals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-surface font-semibold">
                {selection && <td />}
                {actionsFirst && (
                  <td className={cn(pinned, "bg-surface px-5 py-3 text-muted")}>Total</td>
                )}
                {visibleColumns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-5 py-3",
                      column.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {column.total
                      ? column.total(rows)
                      : index === 0 && !actionsFirst && <span className="text-muted">Total</span>}
                  </td>
                ))}
                {actionsLast && <td className={cn(pinned, "bg-surface")} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <TableFooter
        start={start}
        shown={pageRows.length}
        total={rows.length}
        unfiltered={allRows.length}
        page={current}
        pages={pages}
        onPageChange={setPage}
      />
    </Card>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/** "Columns" dropdown: which columns are shown. Action is always shown. */
function ColumnMenu<T>({
  columns,
  hidden,
  onToggle,
}: {
  columns: DataColumn<T>[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-surface hover:text-foreground",
          open ? "bg-surface text-foreground" : "text-muted",
        )}
      >
        <Icon name="columns" className="h-3.5 w-3.5" />
        Columns
        {hidden.size > 0 && (
          <span className="rounded bg-brand-50 px-1 text-[10px] text-brand-600">
            {columns.length - hidden.size}/{columns.length}
          </span>
        )}
      </button>

      <div
        className={cn(
          "scrollbar-none absolute left-0 top-full z-20 mt-1.5 max-h-80 w-56 origin-top-left overflow-y-auto rounded-lg border border-line bg-background p-1.5 shadow-lg shadow-navy-950/10 transition-[opacity,transform] duration-150 ease-out",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {columns.map((column) => (
          <label
            key={column.key}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-surface"
          >
            <input
              type="checkbox"
              tabIndex={open ? 0 : -1}
              checked={!hidden.has(column.key)}
              // don't allow hiding the last column — an empty table is useless
              disabled={!hidden.has(column.key) && hidden.size === columns.length - 1}
              onChange={() => onToggle(column.key)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            {column.label}
          </label>
        ))}
      </div>
    </div>
  );
}
