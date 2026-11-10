"use client";

/** Small building blocks shared by the platform admin pages. */

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface dark:border-navy-700 dark:bg-navy-900";

export const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

/** A labelled form field; `error` turns the hint red. */
export function Field({
  label,
  hint,
  error,
  help,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Shown on hover of an info icon next to the label. */
  help?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {help && (
          <span title={help} className="text-brand-500">
            <Icon name="info" className="h-4 w-4" />
          </span>
        )}
      </span>
      {children}
      {(error || hint) && <span className={cn("text-xs", error ? "text-red-600" : "text-muted")}>{error ?? hint}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  label,
  children,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
  error?: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="relative block">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9", error && "border-red-500")}
      >
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

/** On/off switch with a label and an optional line under it. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-zinc-300 transition-colors peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 dark:bg-navy-700" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function FilterSelect({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(filterClass, "appearance-none pl-9 pr-9", value ? "border-brand-500/60" : "border-line")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

/** Filters card with an active-count badge and "Reset filters". */
export function FilterCard({ active, onReset, children }: { active: number; onReset: () => void; children: ReactNode }) {
  return (
    <Card
      title={
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="filter" className="h-4 w-4 text-brand-500" />
          Filters
          {active > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">{active}</span>}
        </h2>
      }
      action={
        active > 0 && (
          <button type="button" onClick={onReset} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground">
            Reset filters
          </button>
        )
      }
      className="print:hidden"
      bodyClassName="border-t border-line pt-4"
    >
      {children}
    </Card>
  );
}

const TONES = {
  blue: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  plum: "bg-plum-500/10 text-plum-600 dark:text-plum-400",
};
export type Tone = keyof typeof TONES;

/** KPI tile: icon, label, big value and a line under it. */
export function Tile({ icon, tone, label, value, sub }: { icon: IconName; tone: Tone; label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-background p-4 shadow-sm shadow-navy-950/[0.03]">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-[11.5px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

/** Thin usage bar: `used` of `limit` (0 = unlimited). Amber from 80% (at the limit too), red only when over it. */
export function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          <span className="font-medium">{used.toLocaleString("en-US")}</span>
          <span className="text-muted"> / {limit === 0 ? "Unlimited" : limit.toLocaleString("en-US")}</span>
        </span>
      </div>
      <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
        <span
          className={cn("block h-full rounded-full", limit === 0 ? "bg-emerald-500/60" : used > limit ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-brand-500")}
          style={{ width: `${limit === 0 ? 100 : Math.max(2, pct)}%` }}
        />
      </span>
    </div>
  );
}
