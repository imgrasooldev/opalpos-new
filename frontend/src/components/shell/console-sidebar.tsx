"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type NavLink = { label: string; href: string };

/** An item with `href` is a plain link; one with `children` is an accordion group. */
export type NavItem = {
  label: string;
  icon: IconName;
  href?: string;
  children?: NavLink[];
};

// Order and sub-items match the old Opal POS sidebar, since users already know
// that layout. Most routes don't exist yet; the links are placeholders.
export const BUSINESS_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "grid" },
  {
    label: "User Management",
    icon: "users",
    children: [
      { label: "Users", href: "/users" },
      { label: "Roles", href: "/roles" },
    ],
  },
  {
    label: "Contacts",
    icon: "contact",
    children: [{ label: "Customers", href: "/contacts/customers" }],
  },
  {
    label: "Inventory",
    icon: "cube",
    children: [
      { label: "List Products", href: "/products" },
      { label: "Add Product", href: "/products/create" },
      { label: "Print Labels", href: "/labels" },
      { label: "Variations", href: "/variations" },
      { label: "Selling Price Group", href: "/selling-price-groups" },
      { label: "Units", href: "/units" },
      { label: "Categories", href: "/categories" },
      { label: "Brands", href: "/brands" },
    ],
  },
  {
    label: "Purchases",
    icon: "cart",
    children: [
      { label: "List Purchases", href: "/purchases" },
      { label: "Add Purchase", href: "/purchases/create" },
      { label: "List Purchase Return", href: "/purchase-returns" },
    ],
  },
  {
    label: "Sell",
    icon: "tag",
    children: [
      { label: "All sales", href: "/sales" },
      { label: "Add Sale", href: "/sales/create" },
      { label: "List POS", href: "/pos" },
      { label: "Add Draft", href: "/drafts/create" },
      { label: "List Drafts", href: "/drafts" },
      { label: "Add Quotation", href: "/quotations/create" },
      { label: "List quotations", href: "/quotations" },
      { label: "List Sell Return", href: "/sell-returns" },
      { label: "Shipments", href: "/shipments" },
      { label: "Discounts", href: "/discounts" },
      { label: "Import Sales", href: "/sales/import" },
    ],
  },
  {
    label: "Stock Transfers",
    icon: "transfer",
    children: [
      { label: "List Stock Transfers", href: "/stock-transfers" },
      { label: "Add Stock Transfer", href: "/stock-transfers/create" },
    ],
  },
  {
    label: "Stock Adjustment",
    icon: "sliders",
    children: [
      { label: "List Stock Adjustments", href: "/stock-adjustments" },
      { label: "Add Stock Adjustment", href: "/stock-adjustments/create" },
    ],
  },
  {
    label: "Expenses",
    icon: "receipt",
    children: [
      { label: "List Expenses", href: "/expenses" },
      { label: "Add Expense", href: "/expenses/create" },
      { label: "Expense Categories", href: "/expense-categories" },
    ],
  },
  {
    label: "Reports",
    icon: "chart",
    children: [
      { label: "Trending Products", href: "/reports/trending-products" },
      { label: "Register Report", href: "/reports/register" },
      { label: "Summary Report", href: "/reports/summary" },
      { label: "Sales Tax Report", href: "/reports/sales-tax" },
      { label: "Sell Payment Report", href: "/reports/sell-payments" },
      { label: "Product Sell Report", href: "/reports/product-sell" },
      { label: "Purchase & Sale", href: "/reports/purchase-sale" },
      { label: "Purchase Payment Report", href: "/reports/purchase-payments" },
      { label: "Stock Report", href: "/reports/stock" },
      { label: "Cashier Commission", href: "/reports/cashier-commission" },
      { label: "Tip Reports", href: "/reports/tips" },
      { label: "Customer Age Restriction", href: "/reports/age-restriction" },
      { label: "Cashiers Sales", href: "/reports/cashier-sales" },
      { label: "Activity Log", href: "/reports/activity-log" },
      { label: "Opal Points", href: "/reports/opal-points" },
    ],
  },
  {
    label: "Settings",
    icon: "gear",
    children: [
      { label: "Subscription", href: "/settings/subscription" },
      { label: "Business Settings", href: "/settings/business" },
      { label: "Business Locations", href: "/settings/locations" },
      { label: "Invoice Settings", href: "/settings/invoice" },
      { label: "Barcode Settings", href: "/settings/barcode" },
      { label: "Receipt Printers", href: "/settings/printers" },
      { label: "Tax Rates", href: "/settings/tax-rates" },
      { label: "Notification Templates", href: "/settings/notifications" },
    ],
  },
];

/**
 * The menu link that matches the current page. Nested pages (such as
 * `/users/create`) resolve to their parent link (`/users`). The longest match
 * wins, so `/products/create` doesn't light up both "List Products" and
 * "Add Product", and a home link like `/platform` doesn't light up on every
 * page under it.
 */
function activeHref(nav: NavItem[], pathname: string) {
  let best: string | undefined;
  const links = nav.flatMap((item) => (item.children ? item.children : item.href ? [{ label: item.label, href: item.href }] : []));
  for (const link of links) {
    const matches = pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (matches && link.href.length > (best?.length ?? 0)) best = link.href;
  }
  return best;
}

/** The group containing the current page starts out open. */
function activeGroup(nav: NavItem[], current: string | undefined) {
  return nav.find((item) => item.children?.some((child) => child.href === current))?.label;
}

type Props = {
  store: { name: string; hint: string };
  user: { name: string; role: string; initials: string };
  /** Desktop only: shrink to an icon rail. The mobile drawer always shows labels. */
  collapsed: boolean;
  /** Mobile only: drawer slid in. */
  mobileOpen: boolean;
  onExpand: () => void;
  onClose: () => void;
  /** The menu; the business console's by default. */
  nav?: NavItem[];
  /** Where the logo links to. */
  homeHref?: string;
};

export function ConsoleSidebar({
  store,
  user,
  collapsed,
  mobileOpen,
  onExpand,
  onClose,
  nav = BUSINESS_NAV,
  homeHref = "/dashboard",
}: Props) {
  const pathname = usePathname();
  const current = activeHref(nav, pathname);
  // accordion: only one group open at a time, like the old sidebar
  const [open, setOpen] = useState(() => activeGroup(nav, current));

  // rail styles use `lg:` so they never touch the mobile drawer
  const railHidden = collapsed && "lg:hidden";
  const railCentered = collapsed && "lg:justify-center lg:px-0";

  return (
    <aside
      // close the mobile drawer once a link is followed
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) onClose();
      }}
      className={cn(
        // mobile: off-canvas drawer; desktop: sticky column that keeps the nav
        // in view while a long page scrolls
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col bg-navy-800",
        "transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        collapsed ? "lg:w-[72px]" : "lg:w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-5 py-5",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <Logo
          href={homeHref}
          tone="light"
          size="sm"
          // wordmark hidden in the rail, only the mark stays
          className={cn(collapsed && "lg:[&>span]:hidden")}
        />
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/65 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <nav className="scrollbar-none flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {nav.map((item) => {
          if (!item.children) {
            const active = current === item.href;

            return (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                  railCentered,
                  active
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                <span className={cn("flex-1 truncate", railHidden)}>{item.label}</span>
              </Link>
            );
          }

          const expanded = open === item.label;
          const hasActive = item.children.some(
            (child) => child.href === current,
          );

          return (
            <div key={item.label}>
              <button
                type="button"
                aria-expanded={expanded}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  // in the rail, a group click widens the sidebar and opens that group
                  if (collapsed && window.matchMedia("(min-width: 1024px)").matches) {
                    onExpand();
                    setOpen(item.label);
                    return;
                  }
                  setOpen(expanded ? undefined : item.label);
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors duration-200",
                  railCentered,
                  expanded || hasActive
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-300 ease-out",
                    expanded ? "scale-110" : "group-hover:scale-110",
                  )}
                />
                <span className={cn("flex-1 truncate", railHidden)}>{item.label}</span>
                <Icon
                  name="chevron-right"
                  className={cn(
                    "h-4 w-4 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    expanded ? "rotate-90 opacity-90" : "opacity-50",
                    railHidden,
                  )}
                />
              </button>

              {/*
                Height animates via grid rows 0fr -> 1fr, so the content height
                never has to be measured and closing is smooth too. A closed
                group is `inert` so Tab can't reach its hidden links.
              */}
              <div
                inert={!expanded}
                onTransitionEnd={(event) => {
                  // after opening, scroll the group into view if it's cut off at the bottom
                  if (
                    expanded &&
                    event.target === event.currentTarget &&
                    event.propertyName === "grid-template-rows"
                  ) {
                    event.currentTarget.parentElement?.scrollIntoView({
                      block: "nearest",
                      behavior: "smooth",
                    });
                  }
                }}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  expanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                  railHidden,
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  {/* left border lines up with the icon so sub-items read as part of the group */}
                  <div className="ml-[21px] mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child, index) => {
                      const active = current === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={active ? "page" : undefined}
                          // staggered on open, all together on close
                          style={{
                            transitionDelay: expanded
                              ? `${Math.min(index, 10) * 25}ms`
                              : "0ms",
                          }}
                          className={cn(
                            "relative rounded-md px-3 py-1.5 text-[12.5px] transition-[color,background-color,opacity,translate] duration-300 ease-out motion-reduce:transition-none",
                            expanded
                              ? "translate-x-0 opacity-100"
                              : "-translate-x-2 opacity-0",
                            active
                              ? "bg-white/10 font-medium text-white"
                              : "text-white/55 hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
                          )}
                        >
                          {/* active item marker, drawn over the border line */}
                          {active && (
                            <span className="absolute -left-[13.5px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-300" />
                          )}
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 p-3">
        <button
          type="button"
          title={collapsed ? store.name : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10",
            railCentered,
          )}
        >
          <Icon name="store" className="h-[18px] w-[18px] text-white/70" />
          <span className={cn("flex-1 leading-tight", railHidden)}>
            <span className="block text-[13px] font-medium text-white">
              {store.name}
            </span>
            <span className="block text-[11px] text-white/55">{store.hint}</span>
          </span>
          <Icon name="chevron-down" className={cn("h-4 w-4 text-white/55", railHidden)} />
        </button>

        <button
          type="button"
          title={collapsed ? user.name : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10",
            railCentered,
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
            {user.initials}
          </span>
          <span className={cn("flex-1 leading-tight", railHidden)}>
            <span className="block text-[13px] font-medium text-white">
              {user.name}
            </span>
            <span className="block text-[11px] text-white/55">{user.role}</span>
          </span>
          <Icon name="chevron-down" className={cn("h-4 w-4 text-white/55", railHidden)} />
        </button>
      </div>
    </aside>
  );
}
