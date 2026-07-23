"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PermissionGate } from "@/components/auth/permission-gate";
import { cn } from "@/lib/cn";

/**
 * Nav items apni permission ke saath — jis cheez ka haq nahi, wo link dikhta
 * hi nahi (`PermissionGate`).
 */
const NAV_ITEMS = [
  { href: "/products", label: "Products", permission: "product.view" },
  { href: "/users", label: "Users", permission: "user.view" },
  { href: "/business", label: "Business", permission: "business.view" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
      <Link href="/products" className="block px-3 pb-4 text-lg font-semibold">
        OpalPOS
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <PermissionGate key={item.href} permission={item.permission}>
            <Link
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900",
              )}
            >
              {item.label}
            </Link>
          </PermissionGate>
        ))}
      </nav>
    </aside>
  );
}
