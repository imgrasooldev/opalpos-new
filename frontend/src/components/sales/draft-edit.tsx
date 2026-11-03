"use client";

/**
 * Edit draft / quotation: waits for the browser store (one saved this
 * session), then opens the form on it.
 */

import Link from "next/link";

import { useHydrated } from "@/components/inventory/product-store";
import { SaleForm } from "@/components/sales/sale-form";
import { useSales, type HeldKind } from "@/components/sales/sales-data";
import { Card } from "@/components/ui/card";

export function DraftEdit({ id, kind = "Draft" }: { id: number; kind?: HeldKind }) {
  const one = kind.toLowerCase();
  const back = kind === "Draft" ? "/drafts" : "/quotations";
  const hydrated = useHydrated();
  const sales = useSales();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const draft = sales.find((s) => s.id === id && s.status === kind);
  if (!draft)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That {one} doesn&apos;t exist any more (deleted, or already converted to a sale).{" "}
          <Link href={back} className="font-medium text-brand-500 hover:underline">
            Back to {one}s
          </Link>
        </p>
      </Card>
    );
  return <SaleForm mode={kind} initial={draft} />;
}
