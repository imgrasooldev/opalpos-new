"use client";

/**
 * Platform admin -> All businesses: every shop on the platform with its
 * plan, status and next billing date.
 *
 * Status chips filter by Active / Trial / Past due / Suspended / Expired /
 * No plan. Row actions: View, Edit, Manage subscription, Log in as business
 * (support), Suspend / Activate, Delete.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { actAsBusiness } from "@/components/platform/business-access";
import { useHydrated } from "@/components/inventory/product-store";
import {
  BIZ_STATES,
  STATE_TONE,
  USD,
  businessStatus,
  fmtDate,
  limitLabel,
  limitsOf,
  subscriptionLabel,
  subscriptionPrice,
  updateBusinesses,
  updateInvoices,
  updateSubscriptions,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
  type BizState,
  type Business,
  type Subscription,
} from "@/components/platform/platform-data";
import { Field, FilterCard, FilterSelect, filterClass, inputClass } from "@/components/platform/platform-ui";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

type Filters = { plan: string; state: string; method: string; from: string; to: string };
const NO_FILTERS: Filters = { plan: "", state: "", method: "", from: "", to: "" };

type Row = Business & { sub: Subscription | undefined; status: ReturnType<typeof businessStatus>; price: number };

export function BusinessesScreen({ initialState }: { initialState?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const invoices = useInvoices();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const [filters, setFilters] = useState<Filters>({ ...NO_FILTERS, state: initialState ?? "" });
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [suspending, setSuspending] = useState<Business | null>(null);

  const all = useMemo<Row[]>(
    () =>
      businesses.map((b) => {
        const sub = subs.find((s) => s.businessId === b.id);
        return { ...b, sub, status: businessStatus(b, sub, invoices, settings), price: sub ? subscriptionPrice(sub, plans, features) : 0 };
      }),
    [businesses, subs, invoices, settings, plans, features],
  );
  const rows = all.filter(
    (b) =>
      (!filters.plan || (filters.plan === "none" ? b.sub && b.sub.planId === null : b.sub?.planId === Number(filters.plan))) &&
      (!filters.state || b.status.state === filters.state) &&
      (!filters.method || b.sub?.method === filters.method) &&
      (!filters.from || b.createdAt >= filters.from) &&
      (!filters.to || b.createdAt <= filters.to),
  );
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const counts = Object.fromEntries(BIZ_STATES.map((s) => [s, all.filter((b) => b.status.state === s).length])) as Record<BizState, number>;

  const columns: DataColumn<Row>[] = [
    {
      key: "name",
      label: "Business",
      sortValue: (b) => b.name,
      text: (b) => b.name,
      render: (b) => (
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-900 dark:text-brand-200">
            {b.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="leading-tight">
            <Link href={`/platform/businesses/${b.id}`} className="font-medium hover:text-brand-500 hover:underline">
              {b.name}
            </Link>
            <span className="block text-xs text-muted">
              #{String(b.id).padStart(4, "0")} · {b.city}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      sortValue: (b) => b.ownerName,
      text: (b) => `${b.ownerName} ${b.ownerEmail}`,
      render: (b) => (
        <span className="leading-tight">
          <span className="block">{b.ownerName}</span>
          <span className="block text-xs text-muted">{b.ownerEmail}</span>
        </span>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      sortValue: (b) => subscriptionLabel(b.sub, plans),
      text: (b) => subscriptionLabel(b.sub, plans),
      render: (b) =>
        b.sub ? (
          <span className="leading-tight">
            <span className="block">{subscriptionLabel(b.sub, plans)}</span>
            <span className="block text-xs text-muted">
              {USD.format(b.price)} / {b.sub.cycle === "Monthly" ? "month" : "year"} · {b.sub.method}
            </span>
          </span>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
    {
      key: "state",
      label: "Status",
      sortValue: (b) => BIZ_STATES.indexOf(b.status.state),
      text: (b) => b.status.state,
      render: (b) => (
        <span className="leading-tight" title={b.status.reason || undefined}>
          <Badge tone={STATE_TONE[b.status.state]}>{b.status.state}</Badge>
          {b.status.state === "Past due" && <span className="mt-0.5 block text-xs text-amber-600">{USD.format(b.status.unpaidTotal)} overdue</span>}
          {b.status.state === "Suspended" && <span className="mt-0.5 block max-w-44 truncate text-xs text-rose-600">{b.suspended ? "By hand" : "Unpaid"}</span>}
        </span>
      ),
    },
    {
      key: "next",
      label: "Next billing",
      sortValue: (b) => b.status.nextBilling ?? "9999",
      text: (b) => (b.status.nextBilling ? fmtDate(b.status.nextBilling) : ""),
      render: (b) =>
        b.status.nextBilling ? (
          <span className="leading-tight">
            <span className="block whitespace-nowrap">{fmtDate(b.status.nextBilling)}</span>
            <span className="block text-xs text-muted">{b.status.inTrial ? "trial ends" : USD.format(b.price)}</span>
          </span>
        ) : b.sub ? (
          <span className="text-xs text-muted">Ends {fmtDate(b.sub.periodEnd)}</span>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
    {
      key: "usage",
      label: "Locations / users",
      sortValue: (b) => b.users,
      text: (b) => `${b.locations} / ${b.users}`,
      render: (b) => {
        const limits = limitsOf(b.sub, plans);
        const over = (n: number, l: number) => l !== 0 && n > l;
        return (
          <span className="tabular-nums">
            <span className={cn(over(b.locations, limits.locations) && "font-semibold text-rose-600")}>{b.locations}</span>
            <span className="text-muted">/{limitLabel(limits.locations)}</span>
            <span className="mx-1.5 text-muted">·</span>
            <span className={cn(over(b.users, limits.users) && "font-semibold text-rose-600")}>{b.users}</span>
            <span className="text-muted">/{limitLabel(limits.users)}</span>
          </span>
        );
      },
      align: "right",
    },
    { key: "created", label: "Signed up", sortValue: (b) => b.createdAt, text: (b) => fmtDate(b.createdAt), render: (b) => <span className="whitespace-nowrap">{fmtDate(b.createdAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {BIZ_STATES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.state === s}
            onClick={() => set("state", filters.state === s ? "" : s)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
              filters.state === s ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200" : "border-line bg-background hover:bg-surface",
            )}
          >
            {s}
            <span className="rounded-full bg-surface px-1.5 text-xs tabular-nums text-muted">{hydrated ? counts[s] : "…"}</span>
          </button>
        ))}
      </div>

      <FilterCard active={active} onReset={() => setFilters(NO_FILTERS)}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Plan"
            icon="layers"
            value={filters.plan}
            onChange={(v) => set("plan", v)}
            options={[{ value: "", label: "All plans" }, ...plans.map((p) => ({ value: String(p.id), label: p.name })), { value: "none", label: "Single features (no plan)" }]}
          />
          <FilterSelect label="Status" icon="check" value={filters.state} onChange={(v) => set("state", v)} options={[{ value: "", label: "All" }, ...BIZ_STATES.map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Pays by" icon="card" value={filters.method} onChange={(v) => set("method", v)} options={[{ value: "", label: "All" }, ...["Card", "Bank transfer", "Cash"].map((m) => ({ value: m, label: m }))]} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Signed up</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="Signed up from" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(filterClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")} />
              <span className="text-xs text-muted">to</span>
              <input type="date" aria-label="Signed up to" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(filterClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")} />
            </div>
          </div>
        </div>
      </FilterCard>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <DataTable
          title="All businesses"
          subtitle={active > 0 ? `${rows.length} of ${all.length} businesses match the filters` : `${all.length} businesses on the platform`}
          rows={rows}
          columns={columns}
          rowKey={(b) => b.id}
          defaultSort={{ key: "created", direction: "desc" }}
          defaultPageSize={25}
          noun="businesses"
          exportName="businesses"
          minWidth={1300}
          actionsPosition="start"
          rowClassName={(b) => (b.status.state === "Suspended" ? "bg-rose-50/40 dark:bg-rose-950/20" : undefined)}
          headerAction={
            <Link
              href="/platform/businesses/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add
            </Link>
          }
          actions={(b) => (
            <ActionsMenu
              label={`Actions for ${b.name}`}
              actions={[
                { label: "View", icon: "eye", href: `/platform/businesses/${b.id}` },
                { label: "Edit", icon: "pencil", href: `/platform/businesses/${b.id}/edit` },
                { label: b.sub ? "Manage subscription" : "Start subscription", icon: "card", href: `/platform/businesses/${b.id}/subscription` },
                {
                  label: "Log in as business",
                  icon: "login",
                  onClick: () =>
                    setConfirm({
                      tone: "warning",
                      title: `Log in as ${b.name}?`,
                      confirmLabel: "Log in",
                      message: `You'll open ${b.name}'s console as ${b.ownerName} to help with support. Everything you do there is logged against your admin account.`,
                      onConfirm: () => {
                        actAsBusiness(b.id);
                        router.push("/dashboard");
                      },
                    }),
                },
                b.suspended
                  ? {
                      label: "Activate",
                      icon: "check",
                      dividerBefore: true,
                      onClick: () =>
                        setConfirm({
                          tone: "success",
                          confirmLabel: "Activate",
                          message: `${b.name} will be able to log in and sell again${b.status.overdueDays > settings.graceDays ? ", but it stays suspended until its overdue invoices are paid" : ""}.`,
                          onConfirm: () => updateBusinesses((prev) => prev.map((x) => (x.id === b.id ? { ...x, suspended: false, suspendReason: "" } : x))),
                        }),
                    }
                  : { label: "Suspend", icon: "lock", dividerBefore: true, onClick: () => setSuspending(b) },
                {
                  label: "Delete",
                  icon: "trash",
                  danger: true,
                  onClick: () =>
                    setConfirm({
                      tone: "danger",
                      confirmLabel: "Delete",
                      message: `${b.name}, its subscription and its ${invoices.filter((i) => i.businessId === b.id).length} invoices will be deleted. This can't be undone.`,
                      onConfirm: () => {
                        updateBusinesses((prev) => prev.filter((x) => x.id !== b.id));
                        updateSubscriptions((prev) => prev.filter((s) => s.businessId !== b.id));
                        updateInvoices((prev) => prev.filter((i) => i.businessId !== b.id));
                      },
                    }),
                },
              ]}
            />
          )}
        />
      )}

      {suspending && <SuspendDialog key={suspending.id} business={suspending} onClose={() => setSuspending(null)} />}
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
    </div>
  );
}

/** Suspend by hand, with the reason the owner will see. */
export function SuspendDialog({ business, onClose }: { business: Business; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title={`Suspend ${business.name}?`}
      description="Nobody at the business can log in or sell until you activate it. Its data is kept and billing pauses."
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!reason.trim()}
            onClick={() => {
              updateBusinesses((prev) => prev.map((x) => (x.id === business.id ? { ...x, suspended: true, suspendReason: reason.trim() } : x)));
              onClose();
            }}
          >
            Suspend
          </Button>
        </>
      }
    >
      <Field label="Reason *" hint="The owner sees this when they log in.">
        <textarea aria-label="Reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Chargeback on the last payment…" className={inputClass} />
      </Field>
    </Modal>
  );
}
