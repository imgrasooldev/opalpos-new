"use client";

/**
 * Edit product: the Add product form, filled in, with the old screen's
 * "Edit · Stock · Prices group" tabs. The tabs switch in place — one Update
 * saves all of them. Looks the product up in the demo store after hydration,
 * since products added in this tab only exist in the browser.
 */

import Link from "next/link";
import { useState } from "react";

import { ProductForm, type EditTab } from "@/components/inventory/product-form";
import { useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const TABS: { key: EditTab; label: string; icon: IconName }[] = [
  { key: "edit", label: "Edit", icon: "pencil" },
  { key: "stock", label: "Stock", icon: "cube" },
  { key: "prices", label: "Prices group", icon: "tag" },
];

export function EditProduct({ id }: { id: number }) {
  const [tab, setTab] = useState<EditTab>("edit");
  const hydrated = useHydrated();
  const [products] = useDemoProducts();
  const product = products.find((p) => p.id === id);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!product)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          This product doesn&apos;t exist.{" "}
          <Link href="/products" className="font-medium text-brand-500 hover:text-brand-600">
            Back to products
          </Link>
        </p>
      </Card>
    );

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Product sections" className="flex justify-center">
        <div className="inline-flex rounded-xl border border-line bg-background p-1 shadow-sm shadow-navy-950/[0.03]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors",
                tab === t.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* key: a fresh form if the route switches to another product */}
      <ProductForm key={product.id} product={product} tab={tab} onTabChange={setTab} />
    </div>
  );
}
