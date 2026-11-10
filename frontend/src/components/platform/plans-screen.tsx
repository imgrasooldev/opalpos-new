"use client";

/**
 * Platform admin -> Plans: ready bundles of add-on features with usage
 * limits and trial days, for shops that don't want to pick features one by
 * one. Each card shows what the bundle saves against buying its features
 * on their own, and how many businesses are on it.
 *
 * Deactivate stops new sales; a plan still used by a subscription can't be
 * deleted.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  USD,
  featurePrice,
  limitLabel,
  updatePlans,
  useFeatures,
  usePlans,
  useSubscriptions,
  type Feature,
  type Plan,
} from "@/components/platform/platform-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

/** What the plan's add-ons cost a month when bought one by one. */
export const bundleValue = (p: Pick<Plan, "features">, features: Feature[]) =>
  p.features.reduce((t, k) => t + (features.find((f) => f.key === k) ? featurePrice(features.find((f) => f.key === k)!, "Monthly") : 0), 0);

export function PlansScreen() {
  const hydrated = useHydrated();
  const plans = usePlans();
  const features = useFeatures();
  const subs = useSubscriptions();
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  const list = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const onPlan = (id: number) => subs.filter((s) => s.planId === id).length;
  const featuresOnly = subs.filter((s) => s.planId === null).length;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">
        {plans.filter((p) => p.active).length} plans on sale · {featuresOnly} business{featuresOnly === 1 ? "" : "es"} buy single features without a plan · price changes apply from each business&apos;s next invoice
      </p>
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {list.map((p) => {
          const count = onPlan(p.id);
          return (
            <PlanCard
              key={p.id}
              plan={p}
              features={features}
              footer={
                <>
                  <span className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-muted">
                    <Icon name="building" className="h-4 w-4" />
                    {count}
                  </span>
                  <Link href={`/platform/plans/${p.id}/edit`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    <Icon name="pencil" className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setConfirm(
                        p.active
                          ? {
                              tone: "warning",
                              confirmLabel: "Stop selling",
                              message: `${p.name} won't be offered to new businesses. The ${count} on it keep it and keep renewing.`,
                              onConfirm: () => updatePlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: false } : x))),
                            }
                          : {
                              tone: "success",
                              confirmLabel: "Sell again",
                              message: `${p.name} can be picked for new subscriptions again.`,
                              onConfirm: () => updatePlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: true } : x))),
                            },
                      )
                    }
                  >
                    {p.active ? "Stop selling" : "Sell again"}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => {
                      if (count) {
                        setBlocked(`${count} business${count === 1 ? " is" : "es are"} on ${p.name}, so it can't be deleted. Stop selling it instead.`);
                        return;
                      }
                      setConfirm({
                        tone: "danger",
                        confirmLabel: "Delete",
                        message: `The ${p.name} plan will be deleted.`,
                        onConfirm: () => updatePlans((prev) => prev.filter((x) => x.id !== p.id)),
                      });
                    }}
                    className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </>
              }
            />
          );
        })}
        <Link
          href="/platform/plans/create"
          className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-[13px] text-muted transition-colors hover:border-brand-500/50 hover:text-brand-500"
        >
          <Icon name="plus" className="h-6 w-6" />
          Add plan
        </Link>
      </div>

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
      {blocked && (
        <Modal
          title="Can't delete this plan"
          onClose={() => setBlocked(null)}
          className="max-w-sm"
          footer={
            <Button type="button" variant="secondary" onClick={() => setBlocked(null)}>
              OK
            </Button>
          }
        >
          <p className="text-[13px] text-muted">{blocked}</p>
        </Modal>
      )}
    </div>
  );
}

/** A plan as a pricing card. Used on the list and as the form's live preview. */
export function PlanCard({ plan: p, features, footer }: { plan: Plan; features: Feature[]; footer?: ReactNode }) {
  const addOns = features.filter((f) => !f.core && !f.unit);
  const value = bundleValue(p, features);
  const saves = value - p.monthly;
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-background shadow-sm shadow-navy-950/[0.03]",
        p.highlighted ? "border-brand-500 ring-1 ring-brand-500/30" : "border-line",
        !p.active && "opacity-60",
      )}
    >
      {p.highlighted && <span className="bg-brand-gradient py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white">Most popular</span>}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="mr-1 text-base font-semibold">{p.name || "Plan name"}</h3>
            {p.isPrivate && <Badge tone="amber">Private</Badge>}
            {!p.active && <Badge tone="neutral">Not on sale</Badge>}
          </div>
          {p.description && <p className="mt-1 text-[13px] text-muted">{p.description}</p>}
        </div>
        <div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{USD.format(p.monthly).replace(/\.00$/, "")}</span>
            <span className="text-[13px] text-muted">/ month</span>
          </p>
          <p className="text-xs text-muted">
            or {USD.format(p.yearly).replace(/\.00$/, "")} / year · {p.trialDays ? `${p.trialDays}-day free trial` : "no free trial"}
          </p>
          {saves > 0 && <p className="mt-1 text-xs font-medium text-emerald-600">Saves {USD.format(saves)} a month against buying the features one by one</p>}
        </div>
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-3 text-[13px]">
          {(
            [
              ["Locations", p.locations],
              ["Users", p.users],
              ["Products", p.products],
              ["Invoices / month", p.invoices],
            ] as const
          ).map(([label, n]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium tabular-nums">{limitLabel(n)}</dd>
            </div>
          ))}
        </dl>
        <ul className="grid gap-1.5 text-[13px]">
          <li className="flex items-center gap-2 font-medium">
            <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Core POS
          </li>
          {addOns.map((f) => {
            const on = p.features.includes(f.key);
            return (
              <li key={f.key} className={cn("flex items-center gap-2", !on && "text-muted line-through decoration-zinc-300")}>
                <Icon name={on ? "check" : "close"} className={cn("h-3.5 w-3.5 shrink-0", on ? "text-emerald-600" : "text-zinc-400")} />
                {f.name}
              </li>
            );
          })}
        </ul>
      </div>
      {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </article>
  );
}
