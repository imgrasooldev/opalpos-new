"use client";

/**
 * Logged-in console frame: dark sidebar + topbar + content area.
 *
 * User and store come in as props. For the business console (no `nav`
 * given) it also applies the demo subscription: only paid features in the
 * menu, the blocked / locked screens, and who is signed in. Each console
 * has its own demo sign-in; a signed-out console goes to its login page.
 *
 * It owns the sidebar state: the topbar's menu button collapses the sidebar to
 * an icon rail on desktop (remembered across visits) and opens it as a drawer
 * on mobile.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { resetDemoData } from "@/components/inventory/demo-store";
import { useHydrated } from "@/components/inventory/product-store";
import {
  HOME_BUSINESS_ID,
  featureForPath,
  signOutPlatform,
  signOutShop,
  stopActing,
  useBusinessAccess,
  useDemoAuth,
} from "@/components/platform/business-access";
import { subscriptionLabel } from "@/components/platform/platform-data";
import { FeatureLocked, SubscriptionBlocked, SubscriptionNotice } from "@/components/platform/subscription-gate";
import { BUSINESS_NAV, ConsoleSidebar, type NavItem } from "@/components/shell/console-sidebar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { ConsoleTopbar, type UserMenuItem } from "@/components/shell/console-topbar";
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
  // another business than the demo's own: show its location and owner
  const other = isBusiness && access.business && access.business.id !== HOME_BUSINESS_ID ? access.business : null;
  const shownStore = other ? { name: other.locationName || other.name, hint: other.name } : store;
  const shownUser = other
    ? {
        name: other.ownerName,
        role: "Owner",
        initials: other.ownerName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      }
    : user;

  const router = useRouter();
  const hydrated = useHydrated();
  const auth = useDemoAuth();
  const signedOut = hydrated && (isBusiness ? !auth.shop : !auth.platform);
  const [resetting, setResetting] = useState(false);
  // a signed-out console sends you to its own login
  useEffect(() => {
    if (signedOut) router.replace(isBusiness ? "/login" : "/platform/login");
  }, [signedOut, isBusiness, router]);

  const userMenu: UserMenuItem[] = isBusiness
    ? [
        { label: "Subscription", icon: "card", onSelect: () => router.push("/settings/subscription") },
        ...(access.viaPlatform && access.business
          ? [
              {
                label: "Back to platform",
                icon: "shield" as const,
                onSelect: () => {
                  const id = access.business?.id;
                  stopActing();
                  router.push(`/platform/businesses/${id}`);
                },
              },
            ]
          : []),
        { label: "Reset demo data", icon: "refund", onSelect: () => setResetting(true), dividerBefore: true },
        {
          label: "Sign out",
          icon: "login",
          danger: true,
          onSelect: () => {
            signOutShop();
            router.push("/login");
          },
        },
      ]
    : [
        { label: "Platform settings", icon: "gear", onSelect: () => router.push("/platform/settings") },
        { label: "Open the shop sign-in", icon: "store", onSelect: () => router.push("/login") },
        { label: "Reset demo data", icon: "refund", onSelect: () => setResetting(true), dividerBefore: true },
        {
          label: "Sign out",
          icon: "login",
          danger: true,
          onSelect: () => {
            signOutPlatform();
            router.push("/platform/login");
          },
        },
      ];
  const userDetail = isBusiness
    ? access.business
      ? `${access.business.name} · ${subscriptionLabel(access.sub, access.plans)}`
      : undefined
    : `${user.role} · ${store.name}`;

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
        user={shownUser}
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
          user={shownUser}
          today={today}
          sidebarCollapsed={collapsed}
          onToggleMenu={toggleMenu}
          userMenu={userMenu}
          userDetail={userDetail}
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
          {signedOut ? (
            <p className="py-20 text-center text-[13px] text-muted">Signed out. Taking you to the sign-in page…</p>
          ) : blocked ? (
            <SubscriptionBlocked access={access} />
          ) : locked && !access.enabled.has(locked) ? (
            <FeatureLocked access={access} featureKey={locked} />
          ) : (
            children
          )}
        </main>
      </div>

      {resetting && (
        <ConfirmDialog
          tone="warning"
          title="Reset demo data?"
          confirmLabel="Reset"
          message="Every change made in this browser (sales, products, businesses, invoices, sign-ins…) is thrown away and the demo starts fresh."
          onCancel={() => setResetting(false)}
          onConfirm={() => {
            resetDemoData();
            window.location.href = isBusiness ? "/dashboard" : "/platform";
          }}
        />
      )}
    </div>
  );
}
