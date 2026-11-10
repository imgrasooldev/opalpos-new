"use client";

import { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type UserMenuItem = { label: string; icon: IconName; onSelect: () => void; danger?: boolean; dividerBefore?: boolean };

type Props = {
  /** Breadcrumb ka aakhri hissa — abhi ek hi level. */
  section: string;
  store: { name: string };
  user: { name: string; initials: string };
  today: string;
  sidebarCollapsed: boolean;
  /** Collapses the sidebar on desktop, opens the drawer on mobile. */
  onToggleMenu: () => void;
  /** What the user button opens: sign out, subscription, demo reset… */
  userMenu?: UserMenuItem[];
  /** Line under the name in the menu, e.g. the business or role. */
  userDetail?: string;
};

export function ConsoleTopbar({
  section,
  store,
  user,
  today,
  sidebarCollapsed,
  onToggleMenu,
  userMenu = [],
  userDetail,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-background px-5 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Toggle sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="-ml-1.5 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Icon name="chevron-right" className="h-4 w-4 text-muted" />
          <span className="font-medium">{section}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative hidden xl:block">
          <span className="sr-only">Search</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search anything..."
            className="w-64 rounded-lg border border-line bg-surface py-2 pl-9 pr-16 text-[13px] outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:bg-background"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-background px-1.5 py-0.5 text-[10px] text-muted">
            Ctrl + K
          </kbd>
        </label>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition-colors hover:bg-surface md:flex"
        >
          <Icon name="store" className="h-4 w-4 text-muted" />
          {store.name}
          <Icon name="chevron-down" className="h-4 w-4 text-muted" />
        </button>

        <span className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-muted md:flex">
          <Icon name="calendar" className="h-4 w-4" />
          {today}
        </span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface"
        >
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <UserButton user={user} detail={userDetail} items={userMenu} />
      </div>
    </header>
  );
}

function UserButton({ user, detail, items }: { user: { name: string; initials: string }; detail?: string; items: UserMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
          {user.initials}
        </span>
        <span className="text-[13px] font-medium">{user.name}</span>
        <Icon name="chevron-down" className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-line bg-background p-1.5 shadow-lg shadow-navy-950/10">
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="text-[13px] font-medium">{user.name}</p>
            {detail && <p className="text-xs text-muted">{detail}</p>}
          </div>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface",
                item.danger && "text-rose-600",
                item.dividerBefore && "mt-1.5 border-t border-line pt-2.5",
              )}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
