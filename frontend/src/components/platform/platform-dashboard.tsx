"use client";

/**
 * Platform admin dashboard: all businesses at a glance.
 *   - tiles: businesses, monthly recurring revenue, revenue this month, overdue
 *   - how many businesses are active, on trial, past due, suspended, expired
 *   - revenue over the last 12 months, and the plan mix of running businesses
 *   - needs attention: past due, suspended for non-payment, trials ending,
 *     renewals to run, expired
 *   - the newest sign-ups
 */

import Link from "next/link";
import { useMemo } from "react";

import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { useHydrated } from "@/components/inventory/product-store";
import {
  BIZ_STATES,
  STATE_TONE,
  USD,
  businessStatus,
  dayFrom,
  days,
  daysBetween,
  fmtDate,
  monthlyValue,
  renewalsDue,
  subscriptionLabel,
  today,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
  type BizState,
} from "@/components/platform/platform-data";
import { Tile } from "@/components/platform/platform-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Fixed order, so a plan keeps its colour when others come and go. */
const MIX_COLORS = ["var(--color-brand-500)", "var(--color-aqua-500)", "var(--color-plum-500)", "var(--color-amber-500)", "var(--color-emerald-500)", "var(--color-rose-400)"];

function niceTicks(max: number) {
  const raw = Math.max(1, max) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

type Attention = { kind: "past" | "suspended" | "trial" | "renewal" | "expired"; id: number; name: string; text: string; href: string };
const KIND: Record<Attention["kind"], { icon: IconName; tone: string; label: string }> = {
  past: { icon: "alert", tone: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300", label: "Past due" },
  suspended: { icon: "lock", tone: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300", label: "Suspended for non-payment" },
  trial: { icon: "calendar", tone: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200", label: "Trial ending" },
  renewal: { icon: "transfer", tone: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200", label: "Renewal to run" },
  expired: { icon: "close", tone: "bg-surface text-muted", label: "Expired" },
};

export function PlatformDashboard() {
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const invoices = useInvoices();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();

  const d = useMemo(() => {
    const on = today();
    const rows = businesses.map((b) => {
      const sub = subs.find((s) => s.businessId === b.id);
      return { b, sub, status: businessStatus(b, sub, invoices, settings, on) };
    });
    const paying = rows.filter((r) => r.sub && (r.status.state === "Active" || r.status.state === "Past due"));
    const running = rows.filter((r) => r.sub && ["Active", "Past due", "Trial"].includes(r.status.state));
    const mrr = paying.reduce((t, r) => t + monthlyValue(r.sub!, plans, features), 0);
    const paid = invoices.filter((i) => i.status === "Paid");
    const month = on.slice(0, 7);
    const thisMonth = paid.filter((i) => i.paidAt.startsWith(month));
    const overdue = invoices.filter((i) => i.status === "Unpaid" && i.dueDate < on);

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(`${on}T00:00`);
      date.setDate(1);
      date.setMonth(date.getMonth() - (11 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { label: date.toLocaleDateString("en-US", { month: "short" }), value: paid.filter((p) => p.paidAt.startsWith(key)).reduce((t, p) => t + p.total, 0) };
    });

    const groups = [...plans.map((p) => ({ key: String(p.id), label: p.name })), { key: "none", label: "Single features" }];
    const mix = groups
      .map((g, i) => ({ label: g.label, value: running.filter((r) => (g.key === "none" ? r.sub?.planId === null : String(r.sub?.planId) === g.key)).length, color: MIX_COLORS[i % MIX_COLORS.length] }))
      .filter((m) => m.value > 0);

    const attention: Attention[] = [
      ...rows
        .filter((r) => r.status.state === "Past due")
        .map((r) => ({ kind: "past" as const, id: r.b.id, name: r.b.name, text: `${USD.format(r.status.unpaidTotal)} late by ${days(r.status.overdueDays)}; suspended after ${days(settings.graceDays)}`, href: `/platform/billing?business=${r.b.id}` })),
      ...rows
        .filter((r) => r.status.state === "Suspended" && !r.b.suspended)
        .map((r) => ({ kind: "suspended" as const, id: r.b.id, name: r.b.name, text: `${USD.format(r.status.unpaidTotal)} unpaid for ${days(r.status.overdueDays)}`, href: `/platform/billing?business=${r.b.id}` })),
      ...rows
        .filter((r) => r.status.state === "Trial" && r.sub && r.sub.trialEndDate <= dayFrom(7, on))
        .map((r) => ({ kind: "trial" as const, id: r.b.id, name: r.b.name, text: `${subscriptionLabel(r.sub, plans)} trial ends ${fmtDate(r.sub!.trialEndDate)} (${days(daysBetween(on, r.sub!.trialEndDate) + 1)} left)`, href: `/platform/businesses/${r.b.id}` })),
      ...rows
        .filter((r) => r.status.renewalDue && r.status.state !== "Suspended")
        .map((r) => ({ kind: "renewal" as const, id: r.b.id, name: r.b.name, text: `Period ended ${fmtDate(r.sub!.periodEnd)}; the next invoice isn't issued yet`, href: "/platform/billing" })),
      ...rows
        .filter((r) => r.status.state === "Expired")
        .map((r) => ({ kind: "expired" as const, id: r.b.id, name: r.b.name, text: `Didn't renew; ended ${fmtDate(r.sub!.periodEnd)}`, href: `/platform/businesses/${r.b.id}` })),
    ];

    return {
      rows,
      counts: Object.fromEntries(BIZ_STATES.map((s) => [s, rows.filter((r) => r.status.state === s).length])) as Record<BizState, number>,
      running: running.length,
      mrr,
      thisMonth: thisMonth.reduce((t, i) => t + i.total, 0),
      thisMonthCount: thisMonth.length,
      overdue: overdue.reduce((t, i) => t + i.total, 0),
      overdueCount: overdue.length,
      renewals: renewalsDue(subs, invoices, businesses, on),
      months,
      mix,
      attention,
      recent: [...rows].sort((a, b) => b.b.createdAt.localeCompare(a.b.createdAt)).slice(0, 6),
      newThisMonth: businesses.filter((b) => b.createdAt.startsWith(month)).length,
    };
  }, [businesses, subs, invoices, plans, features, settings]);

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  const ticks = niceTicks(Math.max(...d.months.map((m) => m.value)));
  const yearTotal = d.months.reduce((t, m) => t + m.value, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon="building" tone="blue" label="Businesses" value={String(d.rows.length)} sub={`${d.running} running · ${d.newThisMonth} new this month`} />
        <Tile icon="trend-up" tone="plum" label="Monthly recurring revenue" value={USD.format(d.mrr)} sub={`${whole.format(d.mrr * 12)} a year (ARR)`} />
        <Tile icon="dollar" tone="green" label="Revenue this month" value={USD.format(d.thisMonth)} sub={`${d.thisMonthCount} paid invoice${d.thisMonthCount === 1 ? "" : "s"}`} />
        <Tile icon="alert" tone="rose" label="Overdue" value={USD.format(d.overdue)} sub={d.overdueCount ? `${d.overdueCount} invoice${d.overdueCount === 1 ? "" : "s"} late` : "Nothing late"} />
      </div>

      <div className="flex flex-wrap gap-2">
        {BIZ_STATES.map((s) => (
          <Link
            key={s}
            href={`/platform/businesses?status=${encodeURIComponent(s)}`}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-3 py-1.5 text-[13px] transition-colors hover:bg-surface"
          >
            <Badge tone={STATE_TONE[s]}>{s}</Badge>
            <span className="font-semibold tabular-nums">{d.counts[s]}</span>
          </Link>
        ))}
        {d.renewals > 0 && (
          <Link href="/platform/billing" className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-50 px-3 py-1.5 text-[13px] font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-200">
            <Icon name="transfer" className="h-3.5 w-3.5" />
            {d.renewals} renewal{d.renewals === 1 ? "" : "s"} to run
          </Link>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Revenue" action={<span className="text-xs text-muted">Paid invoices, last 12 months · {whole.format(yearTotal)}</span>} className="xl:col-span-2">
          <LineChart points={d.months} ticks={ticks} formatTick={(v) => whole.format(v)} tickEvery={1} id="platform-revenue" />
        </Card>
        <Card title="Plan mix" action={<span className="text-xs text-muted">Running businesses</span>}>
          <div className="flex flex-wrap items-center gap-6">
            <DonutChart segments={d.mix} centerValue={String(d.running)} centerLabel="Running" label="Running businesses by plan" />
            <ul className="flex min-w-40 flex-1 flex-col">
              {d.mix.map((m) => (
                <li key={m.label} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="flex-1 truncate">{m.label}</span>
                  <span className="font-medium tabular-nums">{m.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Needs attention" action={<span className="text-xs text-muted">{d.attention.length} items</span>} bodyClassName="p-0">
          {d.attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted">All clear.</p>
          ) : (
            <ul className="scrollbar-none max-h-[460px] divide-y divide-line overflow-y-auto">
              {d.attention.map((a) => {
                const k = KIND[a.kind];
                return (
                  <li key={`${a.kind}-${a.id}`} className="flex items-start gap-3 px-5 py-3">
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", k.tone)}>
                      <Icon name={k.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="text-xs text-muted">{k.label}</p>
                      <Link href={a.href} className="font-medium hover:text-brand-500 hover:underline">
                        {a.name}
                      </Link>
                      <p className="text-muted">{a.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Recent sign-ups"
          action={
            <Link href="/platform/businesses" className="text-xs font-medium text-brand-500 hover:underline">
              All businesses
            </Link>
          }
          className="xl:col-span-2"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Plan</th>
                  <th className="px-5 py-2.5 text-right font-medium">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map(({ b, sub, status }) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">
                      <Link href={`/platform/businesses/${b.id}`} className="font-medium hover:text-brand-500 hover:underline">
                        {b.name}
                      </Link>
                      <span className="block text-xs text-muted">{b.city}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {b.ownerName}
                      <span className="block text-xs text-muted">{b.ownerEmail}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="mr-2">{sub ? subscriptionLabel(sub, plans) : "—"}</span>
                      <Badge tone={STATE_TONE[status.state]}>{status.state}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right text-muted">{fmtDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
