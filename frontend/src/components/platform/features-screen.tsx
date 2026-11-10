"use client";

/**
 * Platform admin -> Feature catalog: every feature Opal POS sells.
 *   - Core POS: always included in every subscription, no price
 *   - Paid add-ons: a monthly and a yearly price each, which plans include
 *     them and how many businesses use them; extra locations and users are
 *     sold per unit on top of a plan's limits
 *
 * Add-ons are edited in a popup and can be deactivated (no new sales). One
 * still in a plan or a subscription can't be deleted.
 */

import { useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  USD,
  enabledFeatures,
  updateFeatures,
  useFeatures,
  usePlans,
  useSubscriptions,
  type Feature,
} from "@/components/platform/platform-data";
import { Field, Toggle, inputClass } from "@/components/platform/platform-ui";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

export function FeaturesScreen() {
  const hydrated = useHydrated();
  const features = useFeatures();
  const plans = usePlans();
  const subs = useSubscriptions();
  const [editing, setEditing] = useState<{ feature?: Feature } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const core = features.filter((f) => f.core);
  const addOns = features.filter((f) => !f.core);
  const inPlans = (f: Feature) => plans.filter((p) => p.features.includes(f.key));
  /** Businesses that can use it; for per-unit extras, the units sold. */
  const usage = (f: Feature) =>
    f.unit === "location"
      ? subs.reduce((t, s) => t + s.extraLocations, 0)
      : f.unit === "user"
        ? subs.reduce((t, s) => t + s.extraUsers, 0)
        : subs.filter((s) => enabledFeatures(s, plans, features).has(f.key)).length;
  const boughtAlone = (f: Feature) => subs.filter((s) => s.addOns.includes(f.key) && !plans.find((p) => p.id === s.planId)?.features.includes(f.key)).length;

  const columns: DataColumn<Feature>[] = [
    {
      key: "name",
      label: "Feature",
      sortValue: (f) => f.name,
      text: (f) => `${f.name} ${f.description}`,
      render: (f) => (
        <span className="leading-tight">
          <span className="block font-medium">{f.name}</span>
          <span className="block max-w-96 text-xs text-muted">{f.description}</span>
        </span>
      ),
    },
    {
      key: "sold",
      label: "Sold as",
      sortValue: (f) => f.unit ?? "",
      text: (f) => (f.unit ? `Per ${f.unit}` : "Feature"),
      render: (f) => <Badge tone={f.unit ? "amber" : "blue"}>{f.unit ? `Per ${f.unit}` : "Feature"}</Badge>,
    },
    {
      key: "monthly",
      label: "Monthly",
      sortValue: (f) => f.monthly,
      text: (f) => f.monthly.toFixed(2),
      render: (f) => <span className="font-medium tabular-nums">{USD.format(f.monthly)}</span>,
      align: "right",
    },
    {
      key: "yearly",
      label: "Yearly",
      sortValue: (f) => f.yearly,
      text: (f) => f.yearly.toFixed(2),
      render: (f) => {
        const saving = f.monthly * 12 - f.yearly;
        return (
          <span className="leading-tight">
            <span className="block font-medium tabular-nums">{USD.format(f.yearly)}</span>
            {saving > 0 && <span className="block text-xs text-emerald-600">saves {USD.format(saving)}</span>}
          </span>
        );
      },
      align: "right",
    },
    {
      key: "plans",
      label: "In plans",
      sortValue: (f) => inPlans(f).length,
      text: (f) => inPlans(f).map((p) => p.name).join(", "),
      render: (f) =>
        f.unit ? (
          <span className="text-xs text-muted">Added on top of any plan</span>
        ) : inPlans(f).length ? (
          <span className="flex flex-wrap gap-1">
            {inPlans(f).map((p) => (
              <span key={p.id} className="rounded bg-surface px-1.5 py-0.5 text-xs">
                {p.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-muted">Only sold on its own</span>
        ),
    },
    {
      key: "usage",
      label: "In use",
      sortValue: usage,
      text: (f) => String(usage(f)),
      render: (f) => (
        <span className="leading-tight">
          <span className="block tabular-nums">
            {usage(f)} {f.unit ? `${f.unit}s` : usage(f) === 1 ? "business" : "businesses"}
          </span>
          {!f.unit && boughtAlone(f) > 0 && <span className="block text-xs text-muted">{boughtAlone(f)} bought on its own</span>}
        </span>
      ),
      align: "right",
    },
    {
      key: "status",
      label: "Status",
      sortValue: (f) => (f.active ? 1 : 0),
      text: (f) => (f.active ? "Active" : "Inactive"),
      render: (f) => <Badge tone={f.active ? "green" : "neutral"}>{f.active ? "Active" : "Inactive"}</Badge>,
    },
  ];

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="check" className="h-4 w-4 text-emerald-600" />
            Core POS
            <span className="font-normal text-muted">· always included, no extra charge</span>
          </h2>
        }
        bodyClassName="border-t border-line pt-4"
      >
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {core.map((f) => (
            <li key={f.key} className="rounded-lg border border-line px-4 py-3">
              <p className="text-[13px] font-medium">{f.name}</p>
              <p className="mt-0.5 text-xs text-muted">{f.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <DataTable
        title="Paid add-ons"
        subtitle={`${addOns.filter((f) => f.active).length} on sale · a shop can buy them on their own or get them in a plan`}
        rows={addOns}
        columns={columns}
        rowKey={(f) => f.key}
        defaultSort={{ key: "monthly", direction: "desc" }}
        defaultPageSize={25}
        noun="features"
        exportName="feature-catalog"
        minWidth={1050}
        rowClassName={(f) => (!f.active ? "opacity-60" : undefined)}
        headerAction={
          <Button type="button" variant="brand" onClick={() => setEditing({})}>
            <Icon name="plus" className="h-4 w-4" />
            Add feature
          </Button>
        }
        actions={(f) => (
          <ActionsMenu
            label={`Actions for ${f.name}`}
            actions={[
              { label: "Edit", icon: "pencil", onClick: () => setEditing({ feature: f }) },
              f.active
                ? {
                    label: "Stop selling",
                    icon: "lock",
                    onClick: () =>
                      setConfirm({
                        tone: "warning",
                        confirmLabel: "Stop selling",
                        message: `${f.name} can't be added to new subscriptions. The ${usage(f)} ${f.unit ? `${f.unit}s` : "businesses"} that have it keep it.`,
                        onConfirm: () => updateFeatures((prev) => prev.map((x) => (x.key === f.key ? { ...x, active: false } : x))),
                      }),
                  }
                : {
                    label: "Sell again",
                    icon: "check",
                    onClick: () => updateFeatures((prev) => prev.map((x) => (x.key === f.key ? { ...x, active: true } : x))),
                  },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () => {
                  const used = usage(f);
                  if (f.unit || used || inPlans(f).length) {
                    setBlocked(
                      f.unit
                        ? `${f.name} is how extra seats are sold, so it stays in the catalog. Stop selling it instead.`
                        : `${f.name} is in ${inPlans(f).length} plan${inPlans(f).length === 1 ? "" : "s"} and used by ${used} business${used === 1 ? "" : "es"}. Take it out of the plans and subscriptions first, or stop selling it.`,
                    );
                    return;
                  }
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `${f.name} will be removed from the catalog.`,
                    onConfirm: () => updateFeatures((prev) => prev.filter((x) => x.key !== f.key)),
                  });
                },
              },
            ]}
          />
        )}
      />

      {editing && <FeatureDialog key={editing.feature?.key ?? "new"} feature={editing.feature} all={features} onClose={() => setEditing(null)} />}
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
          title="Can't delete this feature"
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

const money = (v: string) => v.replace(/[^\d.]/g, "");

function FeatureDialog({ feature, all, onClose }: { feature?: Feature; all: Feature[]; onClose: () => void }) {
  const [name, setName] = useState(feature?.name ?? "");
  const [description, setDescription] = useState(feature?.description ?? "");
  const [monthly, setMonthly] = useState(feature ? String(feature.monthly) : "");
  const [yearly, setYearly] = useState(feature ? String(feature.yearly) : "");
  const [active, setActive] = useState(feature?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    else if (all.some((f) => f.key !== feature?.key && f.name.toLowerCase() === name.trim().toLowerCase())) next.name = "A feature with this name exists";
    if (!(Number(monthly) > 0)) next.monthly = "Enter the monthly price";
    if (!(Number(yearly) > 0)) next.yearly = "Enter the yearly price";
    setErrors(next);
    if (Object.keys(next).length) return;
    const values = { name: name.trim(), description: description.trim(), monthly: Number(monthly), yearly: Number(yearly), active };
    if (feature) updateFeatures((prev) => prev.map((f) => (f.key === feature.key ? { ...f, ...values } : f)));
    else {
      const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "feature";
      const key = all.some((f) => f.key === base) ? `${base}_${all.length + 1}` : base;
      updateFeatures((prev) => [...prev, { key, core: false, unit: null, ...values }]);
    }
    onClose();
  }

  return (
    <Modal
      title={feature ? `Edit ${feature.name}` : "Add feature"}
      description={feature ? "Price changes apply from each business's next invoice." : "A new add-on shops can buy. The developers switch it on in the code by its key."}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {feature ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" error={errors.name} className="sm:col-span-2">
          <input aria-label="Feature name" value={name} onChange={(event) => setName(event.target.value)} className={cn(inputClass, errors.name && "border-red-500")} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea aria-label="Feature description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
        </Field>
        <Field label={`Monthly price *${feature?.unit ? ` (per ${feature.unit})` : ""}`} error={errors.monthly}>
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
        <div className="sm:col-span-2">
          <Toggle checked={active} onChange={setActive} label="On sale" hint="Off: it can't be added to new subscriptions" />
        </div>
      </div>
    </Modal>
  );
}
