"use client";

/**
 * Add / Edit business (platform admin). Add creates, in one step:
 *   - the business: name, country, city, currency, time zone
 *   - its owner user: name, email, mobile, username, password
 *   - its first business location: name and address
 *   - its subscription (optional): a plan or single features, billing
 *     cycle, payment method, start date and free trial
 * Edit changes the business, owner and location details; the subscription
 * has its own page.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  COUNTRIES,
  CURRENCIES,
  TIMEZONES,
  dayFrom,
  fmtDate,
  periodEndFor,
  today,
  updateBusinesses,
  updateSubscriptions,
  useBusinesses,
  useFeatures,
  usePlans,
  usePlatformSettings,
  type Business,
} from "@/components/platform/platform-data";
import { Field, Select, inputClass } from "@/components/platform/platform-ui";
import { PriceSummary, SubscriptionPicker, draftFrom, type Draft } from "@/components/platform/subscription-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessForm({ initial }: { initial?: Business }) {
  const router = useRouter();
  const businesses = useBusinesses();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [country, setCountry] = useState(initial?.country ?? "United States");
  const [city, setCity] = useState(initial?.city ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? settings.currency);
  const [timezone, setTimezone] = useState(initial?.timezone ?? settings.timezone);
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  const [email, setEmail] = useState(initial?.ownerEmail ?? "");
  const [mobile, setMobile] = useState(initial?.ownerMobile ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [locationName, setLocationName] = useState(initial?.locationName ?? "Main");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [withSub, setWithSub] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(undefined, settings.defaultPlanId, settings.defaultCycle));
  const [start, setStart] = useState(today);
  const [trial, setTrial] = useState(true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const others = businesses.filter((b) => b.id !== initial?.id);
  const plan = plans.find((p) => p.id === draft.planId);
  const trialDays = plan?.trialDays ?? 0;
  const firstStart = trial && trialDays ? dayFrom(trialDays, start) : start;

  function save() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Business name is required";
    else if (others.some((b) => b.name.toLowerCase() === name.trim().toLowerCase())) next.name = "A business with this name already exists";
    if (!ownerName.trim()) next.ownerName = "Owner name is required";
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email";
    else if (others.some((b) => b.ownerEmail.toLowerCase() === email.trim().toLowerCase())) next.email = "This email already owns a business";
    if (!/^[a-z0-9._-]{4,}$/i.test(username.trim())) next.username = "At least 4 letters, numbers, dots, dashes or underscores";
    else if (others.some((b) => b.username.toLowerCase() === username.trim().toLowerCase())) next.username = "This username is taken";
    if (!locationName.trim()) next.locationName = "Name the first location";
    if (!editing) {
      if (password.length < 8) next.password = "At least 8 characters";
      else if (password !== confirm) next.confirm = "Passwords don't match";
      if (withSub && draft.planId === null && draft.addOns.length === 0) next.sub = "Pick a plan or at least one feature, or add the subscription later";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const id = initial?.id ?? Math.max(0, ...businesses.map((b) => b.id)) + 1;
    const business: Business = {
      id,
      name: name.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: email.trim(),
      ownerMobile: mobile.trim(),
      username: username.trim(),
      country,
      city: city.trim(),
      currency,
      timezone,
      locationName: locationName.trim(),
      address: address.trim(),
      createdAt: initial?.createdAt ?? today(),
      suspended: initial?.suspended ?? false,
      suspendReason: initial?.suspendReason ?? "",
      locations: initial?.locations ?? 1,
      users: initial?.users ?? 1,
      products: initial?.products ?? 0,
      invoicesThisMonth: initial?.invoicesThisMonth ?? 0,
      lastActive: initial?.lastActive ?? today(),
      notes: notes.trim(),
    };
    updateBusinesses((prev) => (editing ? prev.map((b) => (b.id === id ? business : b)) : [...prev, business]));
    if (!editing && withSub) {
      updateSubscriptions((prev) => [
        ...prev,
        {
          businessId: id,
          ...draft,
          startDate: start,
          trialEndDate: firstStart !== start ? dayFrom(-1, firstStart) : "",
          periodStart: firstStart,
          periodEnd: periodEndFor(firstStart, draft.cycle),
          cancelledAt: "",
        },
      ]);
    }
    router.push(`/platform/businesses/${id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {Object.keys(errors).length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          Fix the highlighted fields: {Object.values(errors).join(" · ")}
        </div>
      )}

      <Section title="Business" icon="building">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Business name *" error={errors.name}>
            <input aria-label="Business name" value={name} onChange={(event) => setName(event.target.value)} className={cn(inputClass, errors.name && "border-red-500")} />
          </Field>
          <Field label="Country">
            <Select label="Country" value={country} onChange={setCountry}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="City">
            <input aria-label="City" value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Currency">
            <Select label="Currency" value={currency} onChange={setCurrency}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Time zone">
            <Select label="Time zone" value={timezone} onChange={setTimezone}>
              {TIMEZONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Owner" icon="contact" hint="The owner logs in with this username and is the business's admin.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Full name *" error={errors.ownerName}>
            <input aria-label="Owner name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={cn(inputClass, errors.ownerName && "border-red-500")} />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input aria-label="Owner email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={cn(inputClass, errors.email && "border-red-500")} />
          </Field>
          <Field label="Mobile">
            <input aria-label="Owner mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Username *" error={errors.username}>
            <input aria-label="Username" value={username} onChange={(event) => setUsername(event.target.value)} className={cn(inputClass, "font-mono", errors.username && "border-red-500")} />
          </Field>
          {!editing && (
            <>
              <Field label="Password *" error={errors.password}>
                <span className="relative block">
                  <input aria-label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={cn(inputClass, "pr-10", errors.password && "border-red-500")} />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground">
                    <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                  </button>
                </span>
              </Field>
              <Field label="Confirm password *" error={errors.confirm}>
                <input aria-label="Confirm password" type={showPassword ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} className={cn(inputClass, errors.confirm && "border-red-500")} />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Section title="First location" icon="store" hint="More locations are added from the business's own settings.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Location name *" error={errors.locationName}>
            <input aria-label="Location name" value={locationName} onChange={(event) => setLocationName(event.target.value)} className={cn(inputClass, errors.locationName && "border-red-500")} />
          </Field>
          <Field label="Address">
            <input aria-label="Address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
          </Field>
        </div>
      </Section>

      {!editing && (
        <Section
          title="Subscription"
          icon="card"
          hint={
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={withSub} onChange={(event) => setWithSub(event.target.checked)} className="h-4 w-4 accent-brand-500" />
              Set it up now
            </label>
          }
        >
          {withSub ? (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col gap-5">
                <SubscriptionPicker draft={draft} onChange={setDraft} plans={plans} features={features} />
                <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-2">
                  <Field label="Starts on">
                    <input type="date" aria-label="Starts on" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} />
                  </Field>
                  <label className="flex items-center gap-2 self-end pb-3 text-[13px]">
                    <input type="checkbox" checked={trial && trialDays > 0} disabled={!trialDays} onChange={(event) => setTrial(event.target.checked)} className="h-4 w-4 accent-brand-500" />
                    {trialDays ? `Start with the ${trialDays}-day free trial` : "No free trial without a plan that has one"}
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <PriceSummary draft={draft} plans={plans} features={features} />
                <p className="rounded-lg bg-surface px-4 py-3 text-[13px] text-muted">
                  {firstStart !== start ? `Free until ${fmtDate(dayFrom(-1, firstStart))}. ` : ""}First invoice on {fmtDate(firstStart)}
                  {draft.autoRenew ? `, then every ${draft.cycle === "Monthly" ? "month" : "year"}.` : "; it doesn't renew."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted">The business gets Core POS only and sees a &ldquo;choose a plan&rdquo; screen until a subscription is added.</p>
          )}
          {errors.sub && <p className="mt-2 text-xs text-red-600">{errors.sub}</p>}
        </Section>
      )}

      <Section title="Notes" icon="pencil" hint="Only the platform team sees these.">
        <textarea aria-label="Notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} />
      </Section>

      <div className="flex justify-end gap-3">
        <Link
          href={initial ? `/platform/businesses/${initial.id}` : "/platform/businesses"}
          className="inline-flex items-center rounded-lg border border-line bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          Cancel
        </Link>
        <Button type="button" variant="brand" onClick={save}>
          {editing ? "Update" : "Create business"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon, hint, children }: { title: string; icon: IconName; hint?: ReactNode; children: ReactNode }) {
  return (
    <Card
      title={
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon name={icon} className="h-4 w-4 text-brand-500" />
          {title}
        </h2>
      }
      action={hint && <span className="text-xs text-muted">{hint}</span>}
      bodyClassName="border-t border-line pt-4"
    >
      {children}
    </Card>
  );
}

/** Edit business: waits for the browser store, then opens the form on it. */
export function BusinessEdit({ id }: { id: number }) {
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const business = businesses.find((b) => b.id === id);
  if (!business)
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
  return <BusinessForm initial={business} />;
}
