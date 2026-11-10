"use client";

/**
 * Platform admin -> Settings, in tabs:
 *   - General: platform name, support contacts, currency, time zone
 *   - Sign-up: self sign-up, the plan and billing cycle picked first
 *   - Billing: reminders, grace period and automatic suspension
 *   - Payment methods: card (Stripe), bank transfer and cash
 *   - Email: SMTP server, with a test send
 *   - Invoices: number prefix, tax, address and footer
 *
 * One Save for all tabs; unsaved changes are flagged and can be discarded.
 */

import { useState, type ReactNode } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  CURRENCIES,
  CYCLES,
  DEFAULT_SETTINGS,
  TIMEZONES,
  USD,
  days,
  savePlatformSettings,
  usePlans,
  type Cycle,
  usePlatformSettings,
  type PlatformSettings,
} from "@/components/platform/platform-data";
import { Field, Select, Toggle, inputClass } from "@/components/platform/platform-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Tab = "general" | "plans" | "billing" | "gateways" | "email" | "invoice";
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "general", label: "General", icon: "gear" },
  { key: "plans", label: "Sign-up", icon: "layers" },
  { key: "billing", label: "Billing", icon: "calendar" },
  { key: "gateways", label: "Payment methods", icon: "card" },
  { key: "email", label: "Email", icon: "mail" },
  { key: "invoice", label: "Invoices", icon: "receipt" },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PlatformSettingsScreen() {
  const hydrated = useHydrated();
  const saved = usePlatformSettings();
  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  // remount when the saved settings change, so the form starts from them
  return <SettingsForm key={JSON.stringify(saved)} saved={saved} />;
}

function SettingsForm({ saved }: { saved: PlatformSettings }) {
  const plans = usePlans();
  const [tab, setTab] = useState<Tab>("general");
  const [s, setS] = useState<PlatformSettings>(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // the SMTP password never comes back from the server; a new one is sent only when typed
  const [smtpPassword, setSmtpPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
  };

  function save() {
    const next: Record<string, string> = {};
    if (!s.appName.trim()) next.appName = "Platform name is required";
    if (!EMAIL.test(s.supportEmail)) next.supportEmail = "Enter a valid email";
    if (s.smtpFromEmail && !EMAIL.test(s.smtpFromEmail)) next.smtpFromEmail = "Enter a valid email";
    if (!s.cardEnabled && !s.bankEnabled && !s.cashEnabled) next.gateways = "Keep at least one way to pay switched on";
    if (s.cardEnabled && (!s.stripeKey.trim() || !s.stripeSecret.trim())) next.stripe = "Card payments need both Stripe keys";
    if (s.bankEnabled && !s.bankDetails.trim()) next.paypal = "Add the bank details businesses pay to";
    setErrors(next);
    if (Object.keys(next).length) {
      const firstTab: Tab = next.appName || next.supportEmail ? "general" : next.gateways || next.stripe || next.paypal ? "gateways" : "email";
      setTab(firstTab);
      return;
    }
    savePlatformSettings(s);
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="scrollbar-none flex overflow-x-auto rounded-xl border border-line bg-background px-2">
        {TABS.map((t) => {
          const hasError =
            (t.key === "general" && (errors.appName || errors.supportEmail)) ||
            (t.key === "gateways" && (errors.gateways || errors.stripe || errors.paypal)) ||
            (t.key === "email" && errors.smtpFromEmail);
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[13px] transition-colors", tab === t.key ? "font-medium text-foreground" : "text-muted hover:text-foreground")}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
              {hasError && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
              {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "general" && (
          <Card title="General" bodyClassName="border-t border-line pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Platform name *" error={errors.appName} hint="Shown on emails, invoices and the sign-up page">
                <input aria-label="Platform name" value={s.appName} onChange={(event) => set("appName", event.target.value)} className={cn(inputClass, errors.appName && "border-red-500")} />
              </Field>
              <Field label="Support email *" error={errors.supportEmail}>
                <input aria-label="Support email" type="email" value={s.supportEmail} onChange={(event) => set("supportEmail", event.target.value)} className={cn(inputClass, errors.supportEmail && "border-red-500")} />
              </Field>
              <Field label="Support phone">
                <input aria-label="Support phone" value={s.supportPhone} onChange={(event) => set("supportPhone", event.target.value)} className={inputClass} />
              </Field>
              <Field label="Billing currency" hint="Packages are priced in this currency">
                <Select label="Billing currency" value={s.currency} onChange={(v) => set("currency", v)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Time zone" hint="Used for subscription start and end dates">
                <Select label="Time zone" value={s.timezone} onChange={(v) => set("timezone", v)}>
                  {TIMEZONES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        )}

        {tab === "plans" && (
          <Card title="Sign-up" bodyClassName="border-t border-line pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Toggle checked={s.allowSignup} onChange={(v) => set("allowSignup", v)} label="Allow businesses to sign up" hint="Off: only the platform team can add businesses" />
              <Field label="Default plan" hint="Picked first on sign-up and on Add business">
                <Select label="Default plan" value={String(s.defaultPlanId)} onChange={(v) => set("defaultPlanId", Number(v))}>
                  {plans
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {USD.format(p.monthly)} / month
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Default billing" hint="Monthly or yearly, picked first">
                <Select label="Default billing" value={s.defaultCycle} onChange={(v) => set("defaultCycle", v as Cycle)}>
                  {CYCLES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>
        )}

        {tab === "billing" && (
          <Card title="Billing" action={<span className="text-xs text-muted">Unpaid: reminder, then grace period, then suspend</span>} bodyClassName="border-t border-line pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Remind before renewal (days)" hint="Owners get an email this many days before each renewal">
                <input aria-label="Remind before renewal" value={s.remindBeforeDays} onChange={(event) => set("remindBeforeDays", Number(event.target.value.replace(/\D/g, "")) || 0)} inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Remind about unpaid invoices every (days)">
                <input aria-label="Remind every" value={s.remindEveryDays} onChange={(event) => set("remindEveryDays", Number(event.target.value.replace(/\D/g, "")) || 0)} inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Grace period (days)" hint={`An invoice can be late this long; after that the business is suspended (${days(s.graceDays)} now)`}>
                <input aria-label="Grace period" value={s.graceDays} onChange={(event) => set("graceDays", Number(event.target.value.replace(/\D/g, "")) || 0)} inputMode="numeric" className={inputClass} />
              </Field>
              <Toggle checked={s.autoSuspend} onChange={(v) => set("autoSuspend", v)} label="Suspend automatically" hint="Off: late businesses stay Past due until you suspend them by hand" />
            </div>
          </Card>
        )}

        {tab === "gateways" && (
          <div className="flex flex-col gap-5">
            {errors.gateways && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-200">{errors.gateways}</p>}
            <Gateway title="Card (Stripe)" hint="Charged automatically on every renewal" on={s.cardEnabled} onToggle={(v) => set("cardEnabled", v)} error={errors.stripe}>
              <Field label="Publishable key">
                <input aria-label="Stripe publishable key" value={s.stripeKey} onChange={(event) => set("stripeKey", event.target.value)} className={cn(inputClass, "font-mono")} />
              </Field>
              <Field label="Secret key">
                <Secret label="Stripe secret key" value={s.stripeSecret} onChange={(v) => set("stripeSecret", v)} />
              </Field>
            </Gateway>
            <Gateway title="Bank transfer" hint="The business gets an invoice and pays it by wire" on={s.bankEnabled} onToggle={(v) => set("bankEnabled", v)} error={errors.paypal}>
              <Field label="Bank details on the invoice" className="md:col-span-2">
                <textarea aria-label="Bank details" rows={3} value={s.bankDetails} onChange={(event) => set("bankDetails", event.target.value)} className={inputClass} />
              </Field>
            </Gateway>
            <Gateway title="Cash" hint="Paid at the office; you record it in Billing" on={s.cashEnabled} onToggle={(v) => set("cashEnabled", v)}>
              <Field label="Instructions shown to the business" className="md:col-span-2">
                <textarea aria-label="Cash instructions" rows={2} value={s.cashInstructions} onChange={(event) => set("cashInstructions", event.target.value)} className={inputClass} />
              </Field>
            </Gateway>
          </div>
        )}

        {tab === "email" && (
          <Card title="Email (SMTP)" action={<TestEmail to={s.supportEmail} />} bodyClassName="border-t border-line pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="SMTP host">
                <input aria-label="SMTP host" value={s.smtpHost} onChange={(event) => set("smtpHost", event.target.value)} className={cn(inputClass, "font-mono")} />
              </Field>
              <Field label="Port" hint="587 for TLS, 465 for SSL">
                <input aria-label="SMTP port" value={s.smtpPort} onChange={(event) => set("smtpPort", event.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Username">
                <input aria-label="SMTP username" value={s.smtpUser} onChange={(event) => set("smtpUser", event.target.value)} className={cn(inputClass, "font-mono")} />
              </Field>
              <Field label="Password" hint="Saved encrypted. Leave empty to keep the current one.">
                <Secret label="SMTP password" value={smtpPassword} onChange={setSmtpPassword} placeholder="••••••••••••" />
              </Field>
              <Field label="From name">
                <input aria-label="From name" value={s.smtpFromName} onChange={(event) => set("smtpFromName", event.target.value)} className={inputClass} />
              </Field>
              <Field label="From email" error={errors.smtpFromEmail}>
                <input aria-label="From email" type="email" value={s.smtpFromEmail} onChange={(event) => set("smtpFromEmail", event.target.value)} className={cn(inputClass, errors.smtpFromEmail && "border-red-500")} />
              </Field>
            </div>
          </Card>
        )}

        {tab === "invoice" && (
          <Card title="Invoices" bodyClassName="border-t border-line pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Invoice number prefix" hint={`Invoices read ${s.invoicePrefix || "OP"}-2026-00001`}>
                <input aria-label="Invoice prefix" value={s.invoicePrefix} onChange={(event) => set("invoicePrefix", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} className={cn(inputClass, "font-mono")} />
              </Field>
              <Field label="Tax included in prices (%)" hint="Shown as a separate line on invoices">
                <input aria-label="Invoice tax" value={s.invoiceTax} onChange={(event) => set("invoiceTax", Number(event.target.value.replace(/[^\d.]/g, "")) || 0)} inputMode="decimal" className={inputClass} />
              </Field>
              <Field label="Company address">
                <textarea aria-label="Company address" rows={3} value={s.invoiceAddress} onChange={(event) => set("invoiceAddress", event.target.value)} className={inputClass} />
              </Field>
              <Field label="Footer note">
                <textarea aria-label="Invoice footer" rows={3} value={s.invoiceFooter} onChange={(event) => set("invoiceFooter", event.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-background/90 px-5 py-3 backdrop-blur">
        {dirty ? <span className="mr-auto text-[13px] text-amber-600">You have unsaved changes</span> : <span className="mr-auto text-[13px] text-muted">All changes saved</span>}
        <Button type="button" variant="secondary" onClick={() => setResetting(true)}>
          Restore defaults
        </Button>
        <Button type="button" variant="secondary" disabled={!dirty} onClick={() => setS(saved)}>
          Discard
        </Button>
        <Button type="button" variant="brand" disabled={!dirty} onClick={save}>
          Save settings
        </Button>
      </div>

      {resetting && (
        <ConfirmDialog
          tone="warning"
          title="Restore default settings?"
          confirmLabel="Restore"
          message="Every setting on every tab goes back to its default. Payment keys you entered will be replaced."
          onCancel={() => setResetting(false)}
          onConfirm={() => {
            setResetting(false);
            savePlatformSettings(DEFAULT_SETTINGS);
          }}
        />
      )}
    </div>
  );
}

function Gateway({ title, hint, on, onToggle, error, children }: { title: string; hint: string; on: boolean; onToggle: (v: boolean) => void; error?: string; children: ReactNode }) {
  return (
    <Card
      title={
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {title}
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", on ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-surface text-muted")}>{on ? "On" : "Off"}</span>
        </h2>
      }
      action={
        <label className="flex items-center gap-2 text-xs text-muted">
          {hint}
          <span className="relative inline-flex">
            <input type="checkbox" role="switch" aria-label={`Enable ${title}`} checked={on} onChange={(event) => onToggle(event.target.checked)} className="peer sr-only" />
            <span className="h-5 w-9 rounded-full bg-zinc-300 transition-colors peer-checked:bg-brand-500 dark:bg-navy-700" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      }
      bodyClassName="border-t border-line pt-4"
    >
      <fieldset disabled={!on} className={cn("grid gap-4 md:grid-cols-2", !on && "opacity-50")}>
        {children}
      </fieldset>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  );
}

/** A key or password field with a show / hide button. */
function Secret({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input aria-label={label} type={show ? "text" : "password"} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "pr-10 font-mono")} />
      <button type="button" aria-label={show ? `Hide ${label}` : `Show ${label}`} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground">
        <Icon name={show ? "eye-off" : "eye"} className="h-4 w-4" />
      </button>
    </span>
  );
}

/** "Send test email": a demo of the round trip. */
function TestEmail({ to }: { to: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <span className="flex items-center gap-2">
      {state === "sent" && <span className="text-xs text-emerald-600">Test email sent to {to}</span>}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={state === "sending"}
        onClick={() => {
          setState("sending");
          window.setTimeout(() => setState("sent"), 800);
        }}
      >
        <Icon name="send" className="h-3.5 w-3.5" />
        {state === "sending" ? "Sending…" : "Send test email"}
      </Button>
    </span>
  );
}
