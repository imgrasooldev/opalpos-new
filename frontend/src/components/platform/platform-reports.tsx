"use client";

/**
 * Platform admin -> Reports: how the platform is doing over the last 6 or
 * 12 months.
 *   - revenue per month (paid invoices), MRR now, renewal rate, churn
 *   - per month: revenue, new businesses, lost businesses, renewals paid
 *   - top-selling features: businesses using each add-on (in a plan or
 *     bought on its own) and what the single-feature sales bring in
 *   - monthly recurring revenue by plan
 *
 * A business counts as lost when its plan ends without renewing, or when it
 * is suspended for not paying (a hand suspension is a pause, not a loss).
 */

import { useMemo, useState } from "react";

import { LineChart } from "@/components/charts/line-chart";
import { useHydrated } from "@/components/inventory/product-store";
import {
  USD,
  businessStatus,
  dayFrom,
  enabledFeatures,
  featurePrice,
  monthlyValue,
  today,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
} from "@/components/platform/platform-data";
import { Tile } from "@/components/platform/platform-ui";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/cn";

const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${Math.round(n * 100)}%`;

type MonthRow = { key: string; label: string; revenue: number; added: number; lost: number; renewIssued: number; renewPaid: number };

function niceTicks(max: number) {
  const raw = Math.max(1, max) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

export function PlatformReports() {
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const invoices = useInvoices();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const [span, setSpan] = useState<6 | 12>(12);

  const r = useMemo(() => {
    const on = today();
    const rows = businesses.map((b) => {
      const sub = subs.find((s) => s.businessId === b.id);
      return { b, sub, status: businessStatus(b, sub, invoices, settings, on) };
    });
    // when each lost business was lost
    const lostOn = rows
      .map((r) => {
        if (r.status.state === "Expired" && r.sub) return dayFrom(1, r.sub.periodEnd);
        if (r.status.state === "Suspended" && !r.b.suspended) {
          const oldest = [...r.status.unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
          return oldest ? dayFrom(settings.graceDays + 1, oldest.dueDate) : null;
        }
        return null;
      })
      .filter((d): d is string => Boolean(d));

    const months: MonthRow[] = Array.from({ length: span }, (_, i) => {
      const date = new Date(`${on}T00:00`);
      date.setDate(1);
      date.setMonth(date.getMonth() - (span - 1 - i));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const renewals = invoices.filter((x) => x.kind === "Renewal" && x.status !== "Void" && x.date.startsWith(key));
      return {
        key,
        label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: invoices.filter((x) => x.status === "Paid" && x.paidAt.startsWith(key)).reduce((t, x) => t + x.total, 0),
        added: businesses.filter((b) => b.createdAt.startsWith(key)).length,
        lost: lostOn.filter((d) => d.startsWith(key)).length,
        renewIssued: renewals.length,
        renewPaid: renewals.filter((x) => x.status === "Paid").length,
      };
    });

    const paying = rows.filter((x) => x.sub && (x.status.state === "Active" || x.status.state === "Past due"));
    const running = rows.filter((x) => x.sub && ["Active", "Past due", "Trial"].includes(x.status.state));
    const mrr = paying.reduce((t, x) => t + monthlyValue(x.sub!, plans, features), 0);
    const from = months[0].key;
    const startCount = businesses.filter((b) => b.createdAt.slice(0, 7) < from).length;
    const lostInSpan = months.reduce((t, m) => t + m.lost, 0);
    const issued = months.reduce((t, m) => t + m.renewIssued, 0);
    const paidRenewals = months.reduce((t, m) => t + m.renewPaid, 0);

    const top = features
      .filter((f) => !f.core && !f.unit)
      .map((f) => {
        const using = running.filter((x) => enabledFeatures(x.sub, plans, features).has(f.key));
        const alone = running.filter((x) => x.sub!.addOns.includes(f.key) && !plans.find((p) => p.id === x.sub!.planId)?.features.includes(f.key));
        return {
          key: f.key,
          name: f.name,
          using: using.length,
          alone: alone.length,
          share: running.length ? using.length / running.length : 0,
          revenue: alone.reduce((t, x) => t + featurePrice(f, x.sub!.cycle) / (x.sub!.cycle === "Monthly" ? 1 : 12), 0),
        };
      })
      .sort((a, b) => b.using - a.using || b.revenue - a.revenue);

    const byPlan = [...plans.map((p) => ({ key: String(p.id), name: p.name })), { key: "none", name: "Single features" }]
      .map((g) => {
        const on = paying.filter((x) => (g.key === "none" ? x.sub!.planId === null : String(x.sub!.planId) === g.key));
        return { ...g, count: on.length, mrr: on.reduce((t, x) => t + monthlyValue(x.sub!, plans, features), 0) };
      })
      .filter((g) => g.count > 0)
      .sort((a, b) => b.mrr - a.mrr);

    return {
      months,
      mrr,
      revenue: months.reduce((t, m) => t + m.revenue, 0),
      added: months.reduce((t, m) => t + m.added, 0),
      lost: lostInSpan,
      churn: startCount ? lostInSpan / startCount : 0,
      renewalRate: issued ? paidRenewals / issued : 1,
      issued,
      paidRenewals,
      top,
      byPlan,
      running: running.length,
    };
  }, [businesses, subs, invoices, plans, features, settings, span]);

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  const ticks = niceTicks(Math.max(...r.months.map((m) => m.revenue)));
  const maxCount = Math.max(1, ...r.months.map((m) => Math.max(m.added, m.lost)));
  const maxPlan = Math.max(1, ...r.byPlan.map((p) => p.mrr));

  const monthColumns: DataColumn<MonthRow>[] = [
    { key: "month", label: "Month", sortValue: (m) => m.key, text: (m) => m.label },
    { key: "revenue", label: "Revenue", sortValue: (m) => m.revenue, text: (m) => m.revenue.toFixed(2), render: (m) => <span className="tabular-nums">{USD.format(m.revenue)}</span>, align: "right", total: (l) => <span className="tabular-nums">{USD.format(l.reduce((t, m) => t + m.revenue, 0))}</span> },
    { key: "added", label: "New businesses", sortValue: (m) => m.added, text: (m) => String(m.added), render: (m) => <span className="tabular-nums text-emerald-600">{m.added ? `+${m.added}` : "0"}</span>, align: "right", total: (l) => <span className="tabular-nums">{l.reduce((t, m) => t + m.added, 0)}</span> },
    { key: "lost", label: "Lost businesses", sortValue: (m) => m.lost, text: (m) => String(m.lost), render: (m) => <span className={cn("tabular-nums", m.lost > 0 && "text-rose-600")}>{m.lost ? `-${m.lost}` : "0"}</span>, align: "right", total: (l) => <span className="tabular-nums">{l.reduce((t, m) => t + m.lost, 0)}</span> },
    {
      key: "renewals",
      label: "Renewals paid",
      sortValue: (m) => m.renewPaid,
      text: (m) => `${m.renewPaid}/${m.renewIssued}`,
      render: (m) => (m.renewIssued ? <span className="tabular-nums">{m.renewPaid} of {m.renewIssued}</span> : <span className="text-muted">-</span>),
      align: "right",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-lg border border-line bg-surface p-1">
          {([6, 12] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={span === n}
              onClick={() => setSpan(n)}
              className={cn("rounded-md px-3.5 py-1.5 text-[13px] font-medium", span === n ? "bg-background shadow-sm" : "text-muted hover:text-foreground")}
            >
              Last {n} months
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon="dollar" tone="green" label={`Revenue, last ${span} months`} value={USD.format(r.revenue)} sub={`${whole.format(r.revenue / span)} a month on average`} />
        <Tile icon="trend-up" tone="plum" label="Monthly recurring revenue" value={USD.format(r.mrr)} sub={`${r.running} running businesses`} />
        <Tile icon="transfer" tone="blue" label="Renewal rate" value={pct(r.renewalRate)} sub={`${r.paidRenewals} of ${r.issued} renewals paid`} />
        <Tile icon="trend-down" tone="rose" label="Churn" value={pct(r.churn)} sub={`${r.lost} lost · ${r.added} new in the period`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Revenue per month" action={<span className="text-xs text-muted">Paid invoices</span>} className="xl:col-span-2">
          <LineChart points={r.months.map((m) => ({ label: m.label, value: m.revenue }))} ticks={ticks} formatTick={(v) => whole.format(v)} tickEvery={span === 12 ? 2 : 1} id="platform-report-revenue" />
        </Card>
        <Card title="New and lost businesses" action={<span className="text-xs text-muted">Per month</span>}>
          <ul className="flex flex-col gap-2">
            {r.months.map((m) => (
              <li key={m.key} className="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 text-xs">
                <span className="text-muted">{m.label}</span>
                <span className="flex justify-end" title={`${m.lost} lost`}>
                  <span className="h-2.5 rounded-l-full bg-rose-400" style={{ width: `${(m.lost / maxCount) * 100}%` }} />
                </span>
                <span className="flex items-center gap-1.5" title={`${m.added} new`}>
                  <span className="h-2.5 rounded-r-full bg-emerald-500" style={{ width: `${(m.added / maxCount) * 100}%` }} />
                  {(m.added > 0 || m.lost > 0) && (
                    <span className="tabular-nums text-muted">
                      +{m.added}
                      {m.lost ? ` / -${m.lost}` : ""}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              New
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Lost
            </span>
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Top-selling features" action={<span className="text-xs text-muted">Among {r.running} running businesses</span>} className="xl:col-span-2" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-y border-line bg-surface text-xs text-muted">
                  <th className="px-5 py-2.5 font-medium">Feature</th>
                  <th className="w-64 px-4 py-2.5 font-medium">Businesses using it</th>
                  <th className="px-4 py-2.5 text-right font-medium">Bought on its own</th>
                  <th className="px-5 py-2.5 text-right font-medium">Single sales a month</th>
                </tr>
              </thead>
              <tbody>
                {r.top.map((f) => (
                  <tr key={f.key} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 font-medium">{f.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, f.share * 100)}%` }} />
                        </span>
                        <span className="w-16 text-right tabular-nums">
                          {f.using} <span className="text-xs text-muted">{pct(f.share)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{f.alone}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{USD.format(f.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="MRR by plan" action={<span className="text-xs text-muted">Paying businesses</span>}>
          <ul className="flex flex-col gap-3">
            {r.byPlan.map((p) => (
              <li key={p.key}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium">
                    {p.name} <span className="text-xs font-normal text-muted">· {p.count}</span>
                  </span>
                  <span className="tabular-nums">{USD.format(p.mrr)}</span>
                </div>
                <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-plum-500" style={{ width: `${Math.max(2, (p.mrr / maxPlan) * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <DataTable
        title="Month by month"
        subtitle="Revenue, new and lost businesses, and renewals"
        rows={[...r.months].reverse()}
        columns={monthColumns}
        rowKey={(m) => m.key}
        defaultSort={{ key: "month", direction: "desc" }}
        defaultPageSize={25}
        noun="months"
        exportName="platform-report"
        minWidth={640}
      />
    </div>
  );
}
