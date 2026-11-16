"use client";

/**
 * Period picker for the dashboard ("Last 30 days ▾").
 *
 * Opens a small list under the button, right-aligned so it stays on screen
 * at the edge of the page (left-aligned for the header on phones). Closes on
 * pick, outside click or Escape.
 */

import { useEffect, useRef, useState } from "react";

import {
  DASHBOARD_RANGES,
  type DashboardRange,
} from "@/components/dashboard/dashboard-data";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function RangeMenu({
  value,
  onChange,
  size = "md",
}: {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
  /** "md" for the page header, "sm" for a card header. */
  size?: "md" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = DASHBOARD_RANGES.find((r) => r.key === value)!;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center rounded-lg border transition-colors hover:bg-surface",
          size === "md"
            ? "gap-2 border-line bg-background px-3 py-2 text-[13px]"
            : "gap-1.5 border-line px-2.5 py-1.5 text-xs text-muted",
          open && "border-brand-500/40 bg-surface",
        )}
      >
        {size === "md" && <Icon name="calendar" className="h-4 w-4 text-muted" />}
        {current.label}
        <Icon
          name="chevron-down"
          className={cn(
            "text-muted transition-transform",
            size === "md" ? "h-4 w-4" : "h-3.5 w-3.5",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Period"
          className={cn(
            "animate-[menu-in_120ms_ease-out] absolute top-full z-30 mt-1.5 w-44 rounded-lg border border-line bg-background p-1.5 text-[13px] shadow-xl shadow-navy-950/15",
            // the header button wraps under the greeting on phones, so the
            // menu opens to the right there
            size === "md" ? "left-0 sm:left-auto sm:right-0" : "right-0",
          )}
        >
          {DASHBOARD_RANGES.map((range) => {
            const selected = range.key === value;
            return (
              <li key={range.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(range.key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface",
                    selected && "font-medium text-brand-600",
                  )}
                >
                  {range.label}
                  {selected && <Icon name="check" className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
