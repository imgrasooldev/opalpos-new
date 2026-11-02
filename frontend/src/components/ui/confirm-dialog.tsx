"use client";

/**
 * "Are you sure?" confirmation, as the old Opal POS asks before bulk and
 * destructive actions. Native <dialog> like Modal: focus is trapped, Escape
 * and a backdrop click cancel. Render it only while it should be open.
 */

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type ConfirmOptions = {
  title?: string;
  /** What will happen, e.g. "2 products will be hidden from sales screens." */
  message: string;
  confirmLabel?: string;
  /** "danger" for deletes (red), "warning" for hiding things (amber), "success" for restoring (green). */
  tone?: "danger" | "warning" | "success";
  onConfirm: () => void;
};

const TONES = {
  danger: {
    glyph: "trash",
    icon: "bg-rose-50 text-rose-600 dark:bg-rose-950",
    button: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400",
  },
  warning: {
    glyph: "alert",
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950",
    button: "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400",
  },
  success: {
    glyph: "eye",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950",
    button: "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400",
  },
} as const satisfies Record<string, { glyph: IconName; icon: string; button: string }>;

export function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "OK",
  tone = "warning",
  onConfirm,
  onCancel,
}: ConfirmOptions & { onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-line bg-background p-0 text-foreground shadow-2xl shadow-navy-950/25 backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px] animate-[menu-in_160ms_ease-out]"
    >
      <div className="flex flex-col items-center px-6 pb-5 pt-7 text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            TONES[tone].icon,
          )}
        >
          <Icon name={TONES[tone].glyph} className="h-7 w-7" />
        </span>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{message}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface/60 px-6 py-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {/* own classes: `cn` doesn't merge, so Button's default bg would win over an override */}
        <button
          type="button"
          // OK gets focus, so Enter confirms like the old dialog
          autoFocus
          onClick={onConfirm}
          className={cn(
            "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium text-white transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            TONES[tone].button,
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
