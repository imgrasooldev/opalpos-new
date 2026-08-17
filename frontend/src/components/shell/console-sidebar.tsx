"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Aage sub-items honge — abhi sirf chevron dikhta hai. */
  expandable?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  { label: "Users", href: "/users", icon: "users" },
  { label: "Contacts", href: "/contacts", icon: "contact" },
  { label: "Inventory", href: "/inventory", icon: "cube", expandable: true },
  { label: "Purchases", href: "/purchases", icon: "cart", expandable: true },
  { label: "Sales", href: "/sales", icon: "tag", expandable: true },
  { label: "Stock Transfers", href: "/stock-transfers", icon: "transfer" },
  { label: "Stock Adjustment", href: "/stock-adjustment", icon: "sliders" },
  { label: "Reports", href: "/reports", icon: "chart" },
  { label: "Settings", href: "/settings", icon: "gear" },
];

type Props = {
  store: { name: string; hint: string };
  user: { name: string; role: string; initials: string };
};

export function ConsoleSidebar({ store, user }: Props) {
  const pathname = usePathname();

  return (
    // sticky + h-screen -> lamba page scroll ho to bhi nav saamne rehta hai
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-800 lg:flex">
      <div className="px-5 py-5">
        <Logo href="/dashboard" tone="light" size="sm" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.expandable && (
                <Icon name="chevron-right" className="h-4 w-4 opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
        >
          <Icon name="store" className="h-[18px] w-[18px] text-white/70" />
          <span className="flex-1 leading-tight">
            <span className="block text-[13px] font-medium text-white">
              {store.name}
            </span>
            <span className="block text-[11px] text-white/55">{store.hint}</span>
          </span>
          <Icon name="chevron-down" className="h-4 w-4 text-white/55" />
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
            {user.initials}
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[13px] font-medium text-white">
              {user.name}
            </span>
            <span className="block text-[11px] text-white/55">{user.role}</span>
          </span>
          <Icon name="chevron-down" className="h-4 w-4 text-white/55" />
        </button>
      </div>
    </aside>
  );
}
