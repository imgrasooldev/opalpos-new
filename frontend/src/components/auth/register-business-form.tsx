"use client";

/**
 * Register Business (shop self sign-up), in three steps:
 *   1. the business and its first location
 *   2. the owner's login
 *   3. a plan, billed monthly or yearly, starting with its free trial
 *
 * DEMO: it creates the business and its subscription in the platform data,
 * signs the owner in and opens the console. The platform admin sees the new
 * shop on its businesses list straight away (same browser).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { DEMO_PASSWORD } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { signInAsBusiness } from "@/components/platform/business-access";
import {
  COUNTRIES,
  CURRENCIES,
  CYCLES,
  TIMEZONES,
  USD,
  dayFrom,
  fmtDate,
  limitLabel,
  periodEndFor,
  planPrice,
  today,
  updateBusinesses,
  updateSubscriptions,
  useBusinesses,
  usePlans,
  usePlatformSettings,
  type Cycle,
  type PayMethod,
} from "@/components/platform/platform-data";
import { Field, Select, inputClass } from "@/components/platform/platform-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["Business", "Your login", "Plan"] as const;

export function RegisterBusinessForm() {
  const router = useRouter();
  const businesses = useBusinesses();
  const plans = usePlans();
  const settings = usePlatformSettings();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [locationName, setLocationName] = useState("Main");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [planId, setPlanId] = useState(settings.defaultPlanId);
  const [cycle, setCycle] = useState<Cycle>(settings.defaultCycle);
  const methods = (
    [
      ["Card", settings.cardEnabled],
      ["Bank transfer", settings.bankEnabled],
      ["Cash", settings.cashEnabled],
    ] as const
  )
    .filter(([, on]) => on)
    .map(([m]) => m as PayMethod);
  const [method, setMethod] = useState<PayMethod>(methods[0] ?? "Card");
  const [agree, setAgree] = useState(false);

  const choices = plans.filter((p) => p.active && !p.isPrivate).sort((a, b) => a.sortOrder - b.sortOrder);
  const plan = choices.find((p) => p.id === planId) ?? choices[0];

  if (!settings.allowSignup)
    return (
      <Shell>
        <p className="text-center text-[13px] text-muted">
          Sign-up is closed right now. Email{" "}
          <a href={`mailto:${settings.supportEmail}`} className="font-medium text-brand-500 hover:underline">
            {settings.supportEmail}
          </a>{" "}
          and we&apos;ll set your shop up.
        </p>
      </Shell>
    );

  function check(s: number) {
    const next: Record<string, string> = {};
    if (s === 0) {
      if (!name.trim()) next.name = "Business name is required";
      else if (businesses.some((b) => b.name.toLowerCase() === name.trim().toLowerCase())) next.name = "A business with this name is already registered";
      if (!locationName.trim()) next.locationName = "Name your first location";
    }
    if (s === 1) {
      if (!ownerName.trim()) next.ownerName = "Your name is required";
      if (!EMAIL.test(email.trim())) next.email = "Enter a valid email";
      else if (businesses.some((b) => b.ownerEmail.toLowerCase() === email.trim().toLowerCase())) next.email = "This email already has a business; sign in instead";
      if (!/^[a-z0-9._-]{4,}$/i.test(username.trim())) next.username = "At least 4 letters, numbers, dots, dashes or underscores";
      else if (businesses.some((b) => b.username.toLowerCase() === username.trim().toLowerCase())) next.username = "This username is taken";
      if (password.length < 8) next.password = "At least 8 characters";
      else if (password !== confirm) next.confirm = "Passwords don't match";
    }
    if (s === 2) {
      if (!plan) next.plan = "Pick a plan";
      if (!agree) next.agree = "Accept the terms to continue";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function finish() {
    if (!check(2) || !plan) return;
    const id = Math.max(0, ...businesses.map((b) => b.id)) + 1;
    const start = today();
    const first = plan.trialDays ? dayFrom(plan.trialDays, start) : start;
    updateBusinesses((prev) => [
      ...prev,
      {
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
        createdAt: start,
        suspended: false,
        suspendReason: "",
        locations: 1,
        users: 1,
        products: 0,
        invoicesThisMonth: 0,
        lastActive: start,
        notes: "Signed up on the website.",
      },
    ]);
    updateSubscriptions((prev) => [
      ...prev,
      {
        businessId: id,
        planId: plan.id,
        addOns: [],
        extraLocations: 0,
        extraUsers: 0,
        cycle,
        method,
        startDate: start,
        trialEndDate: plan.trialDays ? dayFrom(-1, first) : "",
        periodStart: first,
        periodEnd: periodEndFor(first, cycle),
        autoRenew: true,
        customPrice: null,
        cancelledAt: "",
      },
    ]);
    signInAsBusiness(id);
    router.push("/dashboard");
  }

  return (
    <Shell>
      <ol className="mb-6 flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold",
                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-500 text-white" : "bg-surface text-muted",
              )}
            >
              {i < step ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("truncate", i === step ? "font-medium" : "text-muted")}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name *" error={errors.name} className="sm:col-span-2">
            <input aria-label="Business name" value={name} onChange={(e) => setName(e.target.value)} className={cn(inputClass, errors.name && "border-red-500")} />
          </Field>
          <Field label="Country">
            <Select label="Country" value={country} onChange={setCountry}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="City">
            <input aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
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
          <Field label="First location *" error={errors.locationName} hint="Your shop's name or area, e.g. Main or Downtown">
            <input aria-label="First location" value={locationName} onChange={(e) => setLocationName(e.target.value)} className={cn(inputClass, errors.locationName && "border-red-500")} />
          </Field>
          <Field label="Address">
            <input aria-label="Address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name *" error={errors.ownerName}>
            <input aria-label="Your name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={cn(inputClass, errors.ownerName && "border-red-500")} />
          </Field>
          <Field label="Mobile">
            <input aria-label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email *" error={errors.email}>
            <input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(inputClass, errors.email && "border-red-500")} />
          </Field>
          <Field label="Username *" error={errors.username} hint="You sign in with this or your email">
            <input aria-label="Username" value={username} onChange={(e) => setUsername(e.target.value)} className={cn(inputClass, "font-mono", errors.username && "border-red-500")} />
          </Field>
          <Field label="Password *" error={errors.password}>
            <input aria-label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={cn(inputClass, errors.password && "border-red-500")} />
          </Field>
          <Field label="Confirm password *" error={errors.confirm}>
            <input aria-label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={cn(inputClass, errors.confirm && "border-red-500")} />
          </Field>
          <p className="text-xs text-muted sm:col-span-2">Demo tip: any password of 8+ characters works, e.g. {DEMO_PASSWORD}.</p>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Billing" className="inline-flex self-center rounded-lg border border-line bg-surface p-1">
            {CYCLES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => setCycle(c)}
                className={cn("rounded-md px-3.5 py-1.5 text-[13px] font-medium", cycle === c ? "bg-background shadow-sm" : "text-muted")}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {choices.map((p) => {
              const on = p.id === plan?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPlanId(p.id)}
                  className={cn("flex flex-col rounded-xl border p-3.5 text-left transition-colors", on ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500/30 dark:bg-brand-900/30" : "border-line hover:bg-surface")}
                >
                  <span className="flex items-center justify-between gap-2 font-medium">
                    {p.name}
                    {p.highlighted && <Badge tone="blue">Popular</Badge>}
                  </span>
                  <span className="mt-1 text-lg font-semibold tabular-nums">
                    {USD.format(planPrice(p, cycle))}
                    <span className="text-xs font-normal text-muted"> / {cycle === "Monthly" ? "month" : "year"}</span>
                  </span>
                  <span className="mt-1 text-xs text-muted">{p.description}</span>
                  <span className="mt-2 text-xs text-muted">
                    {limitLabel(p.locations)} location{p.locations === 1 ? "" : "s"} · {limitLabel(p.users)} users · {p.features.length} add-ons
                  </span>
                </button>
              );
            })}
          </div>
          <Field label="Pay by">
            <Select label="Pay by" value={method} onChange={(v) => setMethod(v as PayMethod)}>
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          {plan && (
            <p className="rounded-lg bg-surface px-4 py-3 text-[13px]">
              {plan.trialDays ? (
                <>
                  <b>Free for {plan.trialDays} days.</b> Then {USD.format(planPrice(plan, cycle))} on {fmtDate(dayFrom(plan.trialDays))}, every {cycle === "Monthly" ? "month" : "year"}. Cancel any time.
                </>
              ) : (
                <>
                  {USD.format(planPrice(plan, cycle))} today, then every {cycle === "Monthly" ? "month" : "year"}.
                </>
              )}
            </p>
          )}
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span>
              I agree to the {settings.appName} terms of service.
              {errors.agree && <span className="block text-xs text-red-600">{errors.agree}</span>}
            </span>
          </label>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : (
          <Link href="/login" className="text-[13px] font-medium text-brand-500 hover:underline">
            I already have an account
          </Link>
        )}
        {step < 2 ? (
          <Button type="button" variant="brand" onClick={() => check(step) && setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button type="button" variant="brand" onClick={finish}>
            {plan?.trialDays ? "Start free trial" : "Create my shop"}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-background p-6 shadow-lg shadow-navy-950/5 sm:p-8 dark:bg-surface">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="md" className="mb-4" />
        <h1 className="text-lg font-semibold tracking-tight">Register your business</h1>
        <p className="mt-1 text-[13px] text-muted">Set up your shop in a minute. No card needed for the trial.</p>
      </div>
      {children}
    </div>
  );
}
