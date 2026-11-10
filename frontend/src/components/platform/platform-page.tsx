/**
 * Frame for every platform admin page: the console shell with the platform
 * menu, then the page title, a short description and optional header
 * actions. Server component, so pages stay server-rendered.
 */

import type { ReactNode } from "react";

import { ConsoleShell } from "@/components/shell/console-shell";
import type { NavItem } from "@/components/shell/console-sidebar";

export const PLATFORM_NAV: NavItem[] = [
  { label: "Dashboard", href: "/platform", icon: "grid" },
  {
    label: "Businesses",
    icon: "building",
    children: [
      { label: "All businesses", href: "/platform/businesses" },
      { label: "Add business", href: "/platform/businesses/create" },
    ],
  },
  { label: "Feature catalog", href: "/platform/features", icon: "tag" },
  {
    label: "Plans",
    icon: "layers",
    children: [
      { label: "All plans", href: "/platform/plans" },
      { label: "Add plan", href: "/platform/plans/create" },
    ],
  },
  { label: "Billing", href: "/platform/billing", icon: "receipt" },
  { label: "Reports", href: "/platform/reports", icon: "chart" },
  { label: "Communicator", href: "/platform/communicator", icon: "send" },
  { label: "Platform users", href: "/platform/users", icon: "shield" },
  { label: "Settings", href: "/platform/settings", icon: "gear" },
];

/** The signed-in platform admin, until auth is wired up. */
export const PLATFORM_SESSION = {
  user: { name: "Adnan", role: "Super admin", initials: "AA" },
  store: { name: "Opal POS platform", hint: "Super admin console" },
  today: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
};

export function PlatformPage({
  section,
  title,
  description,
  actions,
  children,
}: {
  /** Breadcrumb in the top bar. */
  section: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, store, today } = PLATFORM_SESSION;
  return (
    <ConsoleShell section={section} store={store} user={user} today={today} nav={PLATFORM_NAV} homeHref="/platform">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-[13px] text-muted">{description}</p>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </ConsoleShell>
  );
}
