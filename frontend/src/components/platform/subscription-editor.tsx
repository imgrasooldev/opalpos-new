"use client";

/**
 * Picking what a business buys, used by Add business and by a business's
 * Manage subscription page:
 *   - a plan, or single features without a plan
 *   - add-on features on top (with their price; the plan's own are shown
 *     as included), extra locations and users
 *   - monthly or yearly billing, payment method, auto renewal, and an
 *     optional agreed price
 * The summary shows the invoice lines and, when changing a running
 * subscription, what changes and when it reaches the next invoice.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  CYCLES,
  PAY_METHODS,
  USD,
  businessStatus,
  dayFrom,
  enabledFeatures,
  featurePrice,
  fmtDate,
  limitLabel,
  limitsOf,
  linesTotal,
  periodEndFor,
  planPrice,
  priceLines,
  today,
  updateSubscriptions,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
  type Cycle,
  type Feature,
  type PayMethod,
  type Plan,
  type Subscription,
} from "@/components/platform/platform-data";
import { Field, Select, Toggle, inputClass } from "@/components/platform/platform-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type Draft = Pick<Subscription, "planId" | "addOns" | "extraLocations" | "extraUsers" | "cycle" | "method" | "autoRenew" | "customPrice">;

export const draftFrom = (sub: Subscription | undefined, defaultPlanId: number, cycle: Cycle = "Monthly"): Draft =>
  sub
    ? { planId: sub.planId, addOns: sub.addOns, extraLocations: sub.extraLocations, extraUsers: sub.extraUsers, cycle: sub.cycle, method: sub.method, autoRenew: sub.autoRenew, customPrice: sub.customPrice }
    : { planId: defaultPlanId, addOns: [], extraLocations: 0, extraUsers: 0, cycle, method: "Card", autoRenew: true, customPrice: null };

/** The choices; `onChange` gets the whole new draft. */
export function SubscriptionPicker({ draft, onChange, plans, features }: { draft: Draft; onChange: (d: Draft) => void; plans: Plan[]; features: Feature[] }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const plan = plans.find((p) => p.id === draft.planId);
  const addOns = features.filter((f) => !f.core && !f.unit);
  const loc = features.find((f) => f.unit === "location");
  const user = features.find((f) => f.unit === "user");
  const choosable = plans.filter((p) => p.active || p.id === draft.planId).sort((a, b) => a.sortOrder - b.sortOrder);
  const per = draft.cycle === "Monthly" ? "mo" : "yr";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="What they buy"
          value={draft.planId === null ? "features" : "plan"}
          options={[
            { value: "plan", label: "A plan" },
            { value: "features", label: "Single features" },
          ]}
          onChange={(v) => set(v === "features" ? { planId: null } : { planId: plan?.id ?? choosable[0]?.id ?? null })}
        />
        <Segmented label="Billing" value={draft.cycle} options={CYCLES.map((c) => ({ value: c, label: c }))} onChange={(v) => set({ cycle: v as Cycle })} />
      </div>

      {draft.planId !== null && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {choosable.map((p) => {
            const on = p.id === draft.planId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ planId: p.id, addOns: draft.addOns.filter((k) => !p.features.includes(k)) })}
                className={cn("rounded-xl border p-3.5 text-left transition-colors", on ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500/30 dark:bg-brand-900/30" : "border-line hover:bg-surface")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.isPrivate ? <Badge tone="amber">Private</Badge> : on ? <Icon name="check" className="h-4 w-4 text-brand-500" /> : null}
                </span>
                <span className="mt-1 block text-lg font-semibold tabular-nums">
                  {USD.format(planPrice(p, draft.cycle))}
                  <span className="text-xs font-normal text-muted"> / {draft.cycle === "Monthly" ? "month" : "year"}</span>
                </span>
                <span className="block text-xs text-muted">
                  {p.features.length} add-ons · {limitLabel(p.locations)} location{p.locations === 1 ? "" : "s"} · {limitLabel(p.users)} users
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">{draft.planId === null ? "Features" : "Add-ons on top of the plan"}</p>
        <p className="mb-3 flex items-center gap-2 text-xs text-muted">
          <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />
          Core POS is always included.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {addOns.map((f) => {
            const inPlan = Boolean(plan?.features.includes(f.key));
            const on = inPlan || draft.addOns.includes(f.key);
            const disabled = inPlan || (!f.active && !draft.addOns.includes(f.key));
            return (
              <label
                key={f.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors",
                  disabled ? "cursor-default" : "cursor-pointer hover:bg-surface",
                  on ? "border-brand-500/50 bg-brand-50/60 dark:bg-brand-900/30" : "border-line",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={f.name}
                  checked={on}
                  disabled={disabled}
                  onChange={() => set({ addOns: draft.addOns.includes(f.key) ? draft.addOns.filter((k) => k !== f.key) : [...draft.addOns, f.key] })}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="flex-1">{f.name}</span>
                <span className="text-xs tabular-nums text-muted">{inPlan ? "In plan" : !f.active ? "Not on sale" : `${USD.format(featurePrice(f, draft.cycle))}/${per}`}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loc && (
          <Stepper
            label="Extra locations"
            hint={`${USD.format(featurePrice(loc, draft.cycle))} each per ${draft.cycle === "Monthly" ? "month" : "year"} · limit ${limitLabel(limitsOf({ ...draft } as Subscription, plans).locations)}`}
            value={draft.extraLocations}
            onChange={(n) => set({ extraLocations: n })}
          />
        )}
        {user && (
          <Stepper
            label="Extra users"
            hint={`${USD.format(featurePrice(user, draft.cycle))} each per ${draft.cycle === "Monthly" ? "month" : "year"} · limit ${limitLabel(limitsOf({ ...draft } as Subscription, plans).users)}`}
            value={draft.extraUsers}
            onChange={(n) => set({ extraUsers: n })}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Pays by" hint={draft.method === "Card" ? "Charged on each renewal" : "Gets an invoice to pay by hand"}>
          <Select label="Pays by" value={draft.method} onChange={(v) => set({ method: v as PayMethod })}>
            {PAY_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Agreed price" hint="Leave empty for the list price">
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
            <input
              aria-label="Agreed price"
              value={draft.customPrice ?? ""}
              onChange={(event) => {
                const v = event.target.value.replace(/[^\d.]/g, "");
                set({ customPrice: v === "" ? null : Number(v) });
              }}
              inputMode="decimal"
              placeholder="List price"
              className={cn(inputClass, "pl-7")}
            />
          </span>
        </Field>
        <div className="flex items-end">
          <div className="w-full">
            <Toggle checked={draft.autoRenew} onChange={(v) => set({ autoRenew: v })} label="Auto renew" hint="Off: it ends with the current period" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors", value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value === 0} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-lg leading-none hover:bg-surface disabled:opacity-40">
          −
        </button>
        <span aria-label={label} className="w-6 text-center font-semibold tabular-nums">
          {value}
        </span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(value + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-lg leading-none hover:bg-surface">
          +
        </button>
      </span>
    </div>
  );
}

/** Invoice lines for a draft, with the total. */
export function PriceSummary({ draft, plans, features, title = "Each invoice" }: { draft: Draft; plans: Plan[]; features: Feature[]; title?: string }) {
  const lines = priceLines(draft, plans, features);
  return (
    <div className="rounded-xl border border-line bg-background">
      <p className="border-b border-line px-4 py-3 text-sm font-semibold">{title}</p>
      <ul className="divide-y divide-line px-4 text-[13px]">
        {lines.length === 0 && <li className="py-3 text-muted">Core POS only: nothing to charge.</li>}
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3 py-2">
            <span className={cn(l.amount < 0 && "text-emerald-600")}>{l.label}</span>
            <span className="tabular-nums">{USD.format(l.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-line px-4 py-3 text-sm font-semibold">
        <span>Total per {draft.cycle === "Monthly" ? "month" : "year"}</span>
        <span className="tabular-nums">{USD.format(linesTotal(lines))}</span>
      </p>
    </div>
  );
}

/** Platform admin -> Business -> Manage subscription. */
export function SubscriptionManager({ id }: { id: number }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const plans = usePlans();
  const features = useFeatures();
  const invoices = useInvoices();
  const settings = usePlatformSettings();
  const b = businesses.find((x) => x.id === id);
  const sub = subs.find((s) => s.businessId === id);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [start, setStart] = useState(today);
  const [trial, setTrial] = useState(true);

  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  if (!b)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That business doesn&apos;t exist any more.{" "}
          <Link href="/platform/businesses" className="font-medium text-brand-500 hover:underline">
            Back to businesses
          </Link>
        </p>
      </Card>
    );

  const d = draft ?? draftFrom(sub, settings.defaultPlanId, settings.defaultCycle);
  const status = businessStatus(b, sub, invoices, settings);
  const plan = plans.find((p) => p.id === d.planId);
  const before = sub ? enabledFeatures(sub, plans, features) : new Set<string>();
  const after = enabledFeatures({ ...(sub ?? ({} as Subscription)), ...d }, plans, features);
  const added = features.filter((f) => !f.core && after.has(f.key) && !before.has(f.key));
  const removed = features.filter((f) => !f.core && before.has(f.key) && !after.has(f.key));
  const oldTotal = sub ? linesTotal(priceLines(sub, plans, features)) : 0;
  const newTotal = linesTotal(priceLines(d, plans, features));
  const trialDays = plan?.trialDays ?? 0;
  const firstStart = !sub && trial && trialDays ? dayFrom(trialDays, start) : start;
  const empty = d.planId === null && d.addOns.length === 0;

  function save() {
    if (empty) return;
    if (sub) {
      updateSubscriptions((prev) =>
        prev.map((s) => (s.businessId === id ? { ...s, ...d, cancelledAt: !d.autoRenew && s.autoRenew ? today() : d.autoRenew ? "" : s.cancelledAt } : s)),
      );
    } else {
      updateSubscriptions((prev) => [
        ...prev,
        {
          businessId: id,
          ...d,
          startDate: start,
          trialEndDate: firstStart !== start ? dayFrom(-1, firstStart) : "",
          periodStart: firstStart,
          periodEnd: periodEndFor(firstStart, d.cycle),
          cancelledAt: "",
        },
      ]);
    }
    router.push(`/platform/businesses/${id}`);
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {b.name}
            <Badge tone={status.state === "Active" ? "green" : status.state === "Trial" ? "blue" : status.state === "Past due" ? "amber" : status.state === "Suspended" ? "rose" : "neutral"}>{status.state}</Badge>
          </h2>
        }
        action={sub && <span className="text-xs text-muted">Current period {fmtDate(sub.periodStart)} - {fmtDate(sub.periodEnd)}</span>}
        bodyClassName="border-t border-line pt-4"
      >
        <SubscriptionPicker draft={d} onChange={setDraft} plans={plans} features={features} />
        {!sub && (
          <div className="mt-5 grid gap-4 border-t border-line pt-5 md:grid-cols-2">
            <Field label="Starts on">
              <input type="date" aria-label="Starts on" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-[13px]">
              <input type="checkbox" checked={trial && trialDays > 0} disabled={!trialDays} onChange={(event) => setTrial(event.target.checked)} className="h-4 w-4 accent-brand-500" />
              {trialDays ? `Start with the ${trialDays}-day free trial` : "No free trial without a plan that has one"}
            </label>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4 xl:sticky xl:top-5">
        <PriceSummary draft={d} plans={plans} features={features} title={sub ? "Next invoice" : "Each invoice"} />
        <div className="rounded-xl border border-line bg-background p-4 text-[13px]">
          {sub ? (
            <>
              <p className="font-semibold">What changes</p>
              {added.length === 0 && removed.length === 0 && newTotal === oldTotal && d.cycle === sub.cycle && d.autoRenew === sub.autoRenew && d.method === sub.method ? (
                <p className="mt-1 text-muted">Nothing yet.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {added.map((f) => (
                    <li key={f.key} className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      {f.name} switched on now
                    </li>
                  ))}
                  {removed.map((f) => (
                    <li key={f.key} className="flex items-center gap-2 text-rose-600">
                      <Icon name="close" className="h-3.5 w-3.5" />
                      {f.name} switched off now
                    </li>
                  ))}
                  {newTotal !== oldTotal && (
                    <li>
                      Price {USD.format(oldTotal)} → <b>{USD.format(newTotal)}</b> from the next invoice
                      {status.nextBilling ? ` (${fmtDate(status.nextBilling)})` : ""}
                    </li>
                  )}
                  {d.cycle !== sub.cycle && <li>Billing becomes {d.cycle.toLowerCase()} at the next renewal</li>}
                  {d.method !== sub.method && <li>Pays by {d.method.toLowerCase()} from the next invoice</li>}
                  {d.autoRenew !== sub.autoRenew && <li>{d.autoRenew ? "Renews automatically again" : `Stops on ${fmtDate(sub.periodEnd)}; no more invoices`}</li>}
                </ul>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold">First invoice</p>
              <p className="mt-1 text-muted">
                {firstStart !== start ? `Free until ${fmtDate(dayFrom(-1, firstStart))}, then ` : ""}
                {USD.format(newTotal)} on {fmtDate(firstStart)}
                {d.autoRenew ? `, renewing ${d.cycle.toLowerCase()}.` : ", one period only."}
              </p>
            </>
          )}
        </div>
        {empty && <p className="text-xs text-red-600">Pick a plan or at least one feature.</p>}
        <div className="flex gap-3">
          <Link href={`/platform/businesses/${id}`} className="inline-flex flex-1 items-center justify-center rounded-lg border border-line bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
            Cancel
          </Link>
          <Button type="button" variant="brand" className="flex-1 justify-center" disabled={empty} onClick={save}>
            {sub ? "Save changes" : "Start subscription"}
          </Button>
        </div>
      </div>
    </div>
  );
}
