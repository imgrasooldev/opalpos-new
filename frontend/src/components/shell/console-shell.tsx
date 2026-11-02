"use client";

/**
 * Logged-in console frame: dark sidebar + topbar + content area.
 *
 * Deliberately presentational — user/store come in as props, no data hooks
 * inside, so static demo pages and real (auth-guarded) pages can both use it.
 *
 * It owns the sidebar state: the topbar's menu button collapses the sidebar to
 * an icon rail on desktop (remembered across visits) and opens it as a drawer
 * on mobile.
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { ConsoleSidebar } from "@/components/shell/console-sidebar";
import { ConsoleTopbar } from "@/components/shell/console-topbar";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "opalpay.sidebar-collapsed";
const CHANGE_EVENT = "opalpay:sidebar-collapsed";

// The collapsed flag lives in localStorage. Reading it through
// useSyncExternalStore renders "expanded" on the server and during hydration,
// then switches on the client — no hydration mismatch.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // storage blocked (private mode etc.) — the toggle just won't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

type Props = {
  section: string;
  store: { name: string; hint: string };
  user: { name: string; role: string; initials: string };
  today: string;
  children: ReactNode;
};

export function ConsoleShell({
  section,
  store,
  user,
  today,
  children,
}: Props) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      writeCollapsed(!collapsed);
    } else {
      setMobileOpen((open) => !open);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <ConsoleSidebar
        store={store}
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onExpand={() => writeCollapsed(false)}
        onClose={() => setMobileOpen(false)}
      />

      {/* mobile drawer backdrop */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-navy-950/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar
          section={section}
          store={store}
          user={user}
          today={today}
          sidebarCollapsed={collapsed}
          onToggleMenu={toggleMenu}
        />
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
