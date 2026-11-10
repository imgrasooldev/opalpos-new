"use client";

/**
 * Add / Edit plan (platform admin): name and description, monthly and
 * yearly price, free trial days, the four usage limits (0 = unlimited), the
 * add-on features in the bundle (core POS is always in), and options
 * (on sale, most popular, private, sort order). A live preview shows the
 * card, with what the bundle saves against single features.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import { USD, featurePrice, updatePlans, useFeatures, usePlans, type Plan } from "@/components/platform/platform-data";
import { Field, Toggle, inputClass } from "@/components/platform/platform-ui";
import { PlanCard, bundleValue } from "@/components/platform/plans-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const digits = (v: string) => v.replace(/\D/g, "");
const money = (v: string) => v.replace(/[^\d.]/g, "");

export function PlanForm({ initial }: { initial?: Plan }) {
  const router = useRouter();
  const plans = usePlans();
  const features = useFeatures();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [monthly, setMonthly] = useState(initial ? String(initial.monthly) : "");
  const [yearly, setYearly] = useState(initial ? String(initial.yearly) : "");
  const [trialDays, setTrialDays] = useState(String(initial?.trialDays ?? 14));
  const [locations, setLocations] = useState(String(initial?.locations ?? 1));
  const [users, setUsers] = useState(String(initial?.users ?? 3));
  const [products, setProducts] = useState(String(initial?.products ?? 1000));
  const [invoices, setInvoices] = useState(String(initial?.invoices ?? 0));
  const [picked, setPicked] = useState<string[]>(initial?.features ?? ["expenses"]);
  const [active, setActive] = useState(initial?.active ?? true);
  const [highlighted, setHighlighted] = useState(initial?.highlighted ?? false);
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? Math.max(0, ...plans.map((p) => p.sortOrder)) + 1));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addOns = features.filter((f) => !f.core && !f.unit);
  const draft: Plan = {
    id: initial?.id ?? 0,
    name: name.trim(),
    description: description.trim(),
    monthly: Number(monthly) || 0,
    yearly: Number(yearly) || 0,
    trialDays: Number(trialDays) || 0,
    locations: Number(locations) || 0,
    users: Number(users) || 0,
    products: Number(products) || 0,
    invoices: Number(invoices) || 0,
    features: addOns.map((f) => f.key).filter((k) => picked.includes(k)),
    isPrivate,
    highlighted,
    sortOrder: Number(sortOrder) || 0,
    active,
  };
  const value = bundleValue(draft, features);

  function save() {
    const next: Record<string, string> = {};
    if (!draft.name) next.name = "Plan name is required";
    else if (plans.some((p) => p.id !== initial?.id && p.name.toLowerCase() === draft.name.toLowerCase())) next.name = "A plan with this name already exists";
    if (monthly === "" || Number.isNaN(Number(monthly))) next.monthly = "Enter the monthly price";
    if (yearly === "" || Number.isNaN(Number(yearly))) next.yearly = "Enter the yearly price";
    setErrors(next);
    if (Object.keys(next).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const id = initial?.id ?? Math.max(0, ...plans.map((p) => p.id)) + 1;
    // only one plan carries the "Most popular" ribbon
    updatePlans((prev) => {
      const cleared = highlighted ? prev.map((p) => ({ ...p, highlighted: false })) : prev;
      return editing ? cleared.map((p) => (p.id === id ? { ...draft, id } : p)) : [...cleared, { ...draft, id }];
    });
    router.push("/platform/plans");
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {Object.values(errors).join(" · ")}
          </div>
        )}

        <Card title="Plan" bodyClassName="border-t border-line pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name *" error={errors.name}>
              <input aria-label="Plan name" value={name} onChange={(event) => setName(event.target.value)} className={cn(inputClass, errors.name && "border-red-500")} />
            </Field>
            <Field label="Sort order" hint="Lower comes first on the sign-up page">
              <input aria-label="Sort order" value={sortOrder} onChange={(event) => setSortOrder(digits(event.target.value))} inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea aria-label="Description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="Price and trial" bodyClassName="border-t border-line pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Monthly price *" error={errors.monthly} hint={value > 0 ? `Its features cost ${USD.format(value)} a month on their own` : "0 makes it free"}>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                <input aria-label="Monthly price" value={monthly} onChange={(event) => setMonthly(money(event.target.value))} inputMode="decimal" className={cn(inputClass, "pl-7", errors.monthly && "border-red-500")} />
              </span>
            </Field>
            <Field label="Yearly price *" error={errors.yearly} hint={Number(monthly) > 0 ? `12 months is ${USD.format(Number(monthly) * 12)}` : undefined}>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                <input aria-label="Yearly price" value={yearly} onChange={(event) => setYearly(money(event.target.value))} inputMode="decimal" className={cn(inputClass, "pl-7", errors.yearly && "border-red-500")} />
              </span>
            </Field>
            <Field label="Free trial (days)" hint="Free days before the first payment; 0 for none">
              <input aria-label="Trial days" value={trialDays} onChange={(event) => setTrialDays(digits(event.target.value))} inputMode="numeric" className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="Usage limits" action={<span className="text-xs text-muted">0 means unlimited · shops can buy extra locations and users</span>} bodyClassName="border-t border-line pt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LimitField label="Business locations" value={locations} onChange={setLocations} />
            <LimitField label="Users" value={users} onChange={setUsers} />
            <LimitField label="Products" value={products} onChange={setProducts} />
            <LimitField label="Invoices per month" value={invoices} onChange={setInvoices} />
          </div>
        </Card>

        <Card
          title="Features in the bundle"
          action={
            <span className="flex gap-3 text-xs">
              <button type="button" onClick={() => setPicked(addOns.map((f) => f.key))} className="font-medium text-brand-500 hover:underline">
                Select all
              </button>
              <button type="button" onClick={() => setPicked([])} className="font-medium text-muted hover:underline">
                Clear
              </button>
            </span>
          }
          bodyClassName="border-t border-line pt-4"
        >
          <p className="mb-3 flex items-center gap-2 text-[13px] text-muted">
            <Icon name="check" className="h-4 w-4 text-emerald-600" />
            Core POS is always included.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {addOns.map((f) => {
              const on = picked.includes(f.key);
              return (
                <label
                  key={f.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors",
                    on ? "border-brand-500/50 bg-brand-50/60 dark:bg-brand-900/30" : "border-line hover:bg-surface",
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => setPicked((prev) => (on ? prev.filter((k) => k !== f.key) : [...prev, f.key]))} className="h-4 w-4 accent-brand-500" />
                  <span className="flex-1">{f.name}</span>
                  <span className="text-xs tabular-nums text-muted">{USD.format(featurePrice(f, "Monthly"))}/mo</span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="Options" bodyClassName="border-t border-line pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle checked={active} onChange={setActive} label="On sale" hint="Can be picked for new subscriptions" />
            <Toggle checked={highlighted} onChange={setHighlighted} label="Most popular" hint="Ribbon on the sign-up page (one plan)" />
            <Toggle checked={isPrivate} onChange={setIsPrivate} label="Private" hint="Hidden from sign-up; given by the platform team" />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/platform/plans" className="inline-flex items-center rounded-lg border border-line bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
            Cancel
          </Link>
          <Button type="button" variant="brand" onClick={save}>
            {editing ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:sticky xl:top-5">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Icon name="eye" className="h-3.5 w-3.5" />
          Preview
        </p>
        <PlanCard plan={draft} features={features} />
      </div>
    </div>
  );
}

function LimitField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={Number(value) === 0 ? "Unlimited" : undefined}>
      <input aria-label={label} value={value} onChange={(event) => onChange(digits(event.target.value))} inputMode="numeric" className={inputClass} />
    </Field>
  );
}

/** Edit plan: waits for the browser store, then opens the form on it. */
export function PlanEdit({ id }: { id: number }) {
  const hydrated = useHydrated();
  const plans = usePlans();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const plan = plans.find((p) => p.id === id);
  if (!plan)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That plan doesn&apos;t exist any more.{" "}
          <Link href="/platform/plans" className="font-medium text-brand-500 hover:underline">
            Back to plans
          </Link>
        </p>
      </Card>
    );
  return <PlanForm initial={plan} />;
}
