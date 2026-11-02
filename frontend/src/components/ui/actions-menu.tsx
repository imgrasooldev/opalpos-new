"use client";

/**
 * "Actions ▾" row menu, as in the old Opal POS tables.
 *
 * The menu is portalled to <body> with fixed positioning: inside a table's
 * `overflow-x-auto` wrapper an absolutely positioned menu would be clipped.
 * It opens below the button, or above it when there's no room, and closes on
 * outside click, Escape, scroll or resize.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type MenuAction = {
  label: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
  /** Destructive actions (Delete) are drawn in red. */
  danger?: boolean;
  /** Draws a divider above this item to start a new group. */
  dividerBefore?: boolean;
};

const MENU_WIDTH = 220;

export function ActionsMenu({
  actions,
  label,
  trigger = "Actions",
  disabled,
}: {
  actions: MenuAction[];
  /** Accessible name, e.g. "Actions for Kamran Khan". */
  label: string;
  /** Visible button text. */
  trigger?: string;
  disabled?: boolean;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  function toggle() {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current!.getBoundingClientRect();
    const height = actions.length * 34 + 16;
    const below = rect.bottom + 6 + height <= window.innerHeight;
    setPosition({
      top: below ? rect.bottom + 6 : rect.top - 6 - height,
      left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
    });
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    // capture: also catches the table's own horizontal scroll
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-brand-500/30 bg-brand-50 text-brand-600 hover:border-brand-500 dark:bg-brand-900 dark:text-brand-200",
        )}
      >
        {trigger}
        <Icon
          name="chevron-down"
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="animate-[menu-in_120ms_ease-out] fixed z-50 rounded-lg border border-line bg-background p-1.5 text-[13px] shadow-xl shadow-navy-950/15"
          >
            {/* items keep the order given — screens mirror the old menus */}
            {actions.map((action) => (
              <div key={action.label}>
                {action.dividerBefore && <div className="my-1 border-t border-line" />}
                <MenuItem action={action} onDone={() => setPosition(null)} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuItem({ action, onDone }: { action: MenuAction; onDone: () => void }) {
  const className = cn(
    "flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left transition-colors",
    action.danger
      ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
      : "text-foreground hover:bg-surface",
  );
  const content = (
    <>
      <Icon
        name={action.icon}
        className={cn("h-4 w-4", action.danger ? "text-rose-500" : "text-muted")}
      />
      {action.label}
    </>
  );

  return action.href ? (
    <Link role="menuitem" href={action.href} onClick={onDone} className={className}>
      {content}
    </Link>
  ) : (
    <button
      role="menuitem"
      type="button"
      onClick={() => {
        action.onClick?.();
        onDone();
      }}
      className={className}
    >
      {content}
    </button>
  );
}
