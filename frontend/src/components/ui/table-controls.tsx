/**
 * Building blocks shared by the list screens (Users, Roles, ...): the
 * "Show N entries" picker, the search box, the "Showing x to y" footer with
 * pagination, and the small icon buttons in a row's Action column.
 *
 * They hold no state — the table owns search/page/size and passes them in.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const PAGE_SIZES = [10, 25, 50, 100];

export function PageSizeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-muted">
      Show
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-lg border border-line bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-brand-500"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      entries
    </label>
  );
}

export function TableSearch({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Screen-reader label, e.g. "Search users". */
  label: string;
  placeholder: string;
}) {
  return (
    <label className="relative ml-auto w-full sm:w-64">
      <span className="sr-only">{label}</span>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:bg-background"
      />
    </label>
  );
}

/** "Showing 1 to 10 of 42 entries" + Previous / page numbers / Next. */
export function TableFooter({
  start,
  shown,
  total,
  unfiltered,
  page,
  pages,
  onPageChange,
}: {
  /** Zero-based index of the first row on this page. */
  start: number;
  /** Rows on this page. */
  shown: number;
  /** Rows after filtering. */
  total: number;
  /** Rows before filtering — adds "(filtered from N)" when it differs. */
  unfiltered: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px]">
      <span className="text-muted">
        {total === 0
          ? "Showing 0 entries"
          : `Showing ${start + 1} to ${start + shown} of ${total} entries`}
        {total !== unfiltered && ` (filtered from ${unfiltered})`}
      </span>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <PageButton
          label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevron-left" className="h-4 w-4" />
        </PageButton>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <PageButton
            key={n}
            label={`Page ${n}`}
            active={n === page}
            onClick={() => onPageChange(n)}
          >
            {n}
          </PageButton>
        ))}
        <PageButton
          label="Next page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="chevron-right" className="h-4 w-4" />
        </PageButton>
      </nav>
    </footer>
  );
}

const ACTION_TONES = {
  brand: "text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900",
  aqua: "text-aqua-600 hover:bg-aqua-500/10",
  rose: "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950",
};

/** Row icon button. Renders a link when `href` is given, otherwise a button. */
export function RowAction({
  icon,
  label,
  tone,
  href,
  onClick,
}: {
  icon: IconName;
  label: string;
  tone: keyof typeof ACTION_TONES;
  href?: string;
  onClick?: () => void;
}) {
  const className = cn("rounded-lg p-1.5 transition-colors", ACTION_TONES[tone]);
  const content = <Icon name={icon} className="h-4 w-4" />;

  return href ? (
    <Link href={href} aria-label={label} title={label} className={className}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
}

function PageButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-brand-500 font-medium text-white shadow-sm"
          : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
