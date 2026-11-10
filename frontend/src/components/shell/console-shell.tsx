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

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { featureForPath, stopActing, useBusinessAccess } from "@/components/platform/business-access";
import { FeatureLocked, SubscriptionBlocked, SubscriptionNotice } from "@/components/platform/subscription-gate";
import { BUSINESS_NAV, ConsoleSidebar, type NavItem } from "@/components/shell/console-sidebar";
import { Icon } from "@/components/ui/icon";
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
  /** The sidebar menu; the business console's by default. */
  nav?: NavItem[];
  /** Where the sidebar logo links to. */
  homeHref?: string;
};

export function ConsoleShell({
  section,
  store,
  user,
  today,
  children,
  nav,
  homeHref,
}: Props) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // The business console (no `nav` given) shows only what the business paid
  // for; the platform console passes its own menu and skips all of this.
  const isBusiness = !nav;
  const access = useBusinessAccess();
  const businessNav = useMemo(
    () =>
      BUSINESS_NAV.map((item) =>
        item.children
          ? { ...item, children: item.children.filter((c) => { const f = featureForPath(c.href); return !f || access.enabled.has(f); }) }
          : item,
      ).filter((item) => !item.children || item.children.length > 0),
    [access.enabled],
  );
  const blocked = isBusiness && access.status && ["Suspended", "Expired", "No plan"].includes(access.status.state);
  const locked = isBusiness && !blocked ? featureForPath(pathname) : null;
  const shownStore =
    isBusiness && access.viaPlatform && access.business ? { name: access.business.locationName || access.business.name, hint: access.business.name } : store;

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
        store={shownStore}
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onExpand={() => writeCollapsed(false)}
        onClose={() => setMobileOpen(false)}
        nav={nav ?? businessNav}
        homeHref={homeHref}
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
          store={shownStore}
          user={user}
          today={today}
          sidebarCollapsed={collapsed}
          onToggleMenu={toggleMenu}
        />
        {isBusiness && access.viaPlatform && access.business && (
          <div className="flex flex-wrap items-center gap-3 bg-plum-600 px-5 py-2 text-[13px] text-white">
            <Icon name="shield" className="h-4 w-4" />
            <span className="flex-1">
              You&apos;re in <b>{access.business.name}</b>&apos;s console as a platform admin. Everything you do here is logged.
            </span>
            <Link
              href={`/platform/businesses/${access.business.id}`}
              onClick={() => stopActing()}
              className="rounded-md bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25"
            >
              Back to platform
            </Link>
          </div>
        )}
        <main className="flex-1 p-5">
          {isBusiness && !blocked && <SubscriptionNotice access={access} />}
          {blocked ? (
            <SubscriptionBlocked access={access} />
          ) : locked && !access.enabled.has(locked) ? (
            <FeatureLocked access={access} featureKey={locked} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
