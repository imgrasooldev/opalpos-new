"use client";

/**
 * Stock Adjustment -> List stock adjustments, as in the old Opal POS: Action,
 * Date, Reference no, Location, Adjustment type, Total amount, Total amount
 * recovered, Reason and Added by.
 *
 * Actions: View (and Print) and Delete, which puts the stock back.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { updateProducts } from "@/components/inventory/product-store";
import {
  adjustmentTotals,
  applyAdjustment,
  updateAdjustments,
  useAdjustments,
  type StockAdjustment,
} from "@/components/stock-adjustments/adjustments-data";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const TYPE_TONE = { Normal: "blue", Abnormal: "rose" } as const;

export function AdjustmentsScreen() {
  const adjustments = useAdjustments();
  const [viewing, setViewing] = useState<{ id: number; print?: boolean } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const columns: DataColumn<StockAdjustment>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (a) => a.date,
      text: (a) => `${day(a.date)} ${time(a.date)}`,
      render: (a) => (
        <span className="leading-tight">
          <span className="block">{day(a.date)}</span>
          <span className="block text-xs text-muted">{time(a.date)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (a) => a.ref,
      text: (a) => a.ref,
      render: (a) => (
        <button type="button" onClick={() => setViewing({ id: a.id })} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {a.ref}
        </button>
      ),
    },
    { key: "location", label: "Location", sortValue: (a) => a.location, text: (a) => a.location },
    {
      key: "type",
      label: "Adjustment type",
      sortValue: (a) => a.type,
      text: (a) => a.type,
      render: (a) => <Badge tone={TYPE_TONE[a.type]}>{a.type}</Badge>,
    },
    {
      key: "total",
      label: "Total amount",
      sortValue: (a) => adjustmentTotals(a).total,
      text: (a) => adjustmentTotals(a).total.toFixed(2),
      render: (a) => <span className="font-medium tabular-nums">{USD.format(adjustmentTotals(a).total)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((s, a) => s + adjustmentTotals(a).total, 0)),
    },
    {
      key: "recovered",
      label: "Total amount recovered",
      sortValue: (a) => a.recovered,
      text: (a) => a.recovered.toFixed(2),
      render: (a) => <span className="tabular-nums">{USD.format(a.recovered)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((s, a) => s + a.recovered, 0)),
    },
    {
      key: "reason",
      label: "Reason",
      sortValue: (a) => a.reason,
      text: (a) => a.reason,
      render: (a) => (a.reason ? <span className="block max-w-60 truncate" title={a.reason}>{a.reason}</span> : <span className="text-muted">—</span>),
    },
    { key: "addedBy", label: "Added by", sortValue: (a) => a.addedBy, text: (a) => a.addedBy },
  ];

  const viewed = viewing && adjustments.find((a) => a.id === viewing.id);

  return (
    <>
      <DataTable
        title="All stock adjustments"
        subtitle={`${adjustments.length} ${adjustments.length === 1 ? "adjustment" : "adjustments"} · each one is taken out of stock and shows in the product's stock history`}
        rows={adjustments}
        columns={columns}
        rowKey={(a) => a.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="adjustments"
        exportName="stock-adjustments"
        minWidth={1100}
        actionsPosition="start"
        headerAction={
          <Link
            href="/stock-adjustments/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
        actions={(a) => (
          <ActionsMenu
            label={`Actions for ${a.ref}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing({ id: a.id }) },
              { label: "Print", icon: "printer", onClick: () => setViewing({ id: a.id, print: true }) },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `${a.ref} will be deleted and its ${adjustmentTotals(a).items} items put back in stock at ${a.location}.`,
                    onConfirm: () => {
                      updateAdjustments((prev) => prev.filter((x) => x.id !== a.id));
                      updateProducts((prev) => applyAdjustment(prev, a, -1));
                    },
                  }),
              },
            ]}
          />
        )}
      />

      {viewed && <ViewDialog adjustment={viewed} autoPrint={viewing?.print} onClose={() => setViewing(null)} />}

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
    </>
  );
}

function ViewDialog({ adjustment: a, autoPrint, onClose }: { adjustment: StockAdjustment; autoPrint?: boolean; onClose: () => void }) {
  const totals = adjustmentTotals(a);
  useEffect(() => {
    if (!autoPrint) return;
    // let the dialog paint before the print preview opens
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <Modal
      title={`Stock adjustment details (Reference no: ${a.ref})`}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <>
          <Button type="button" variant="brand" onClick={() => window.print()}>
            <Icon name="printer" className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-[13px] sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Business location</p>
          <p className="font-medium">{a.location}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Adjustment type</p>
          <Badge tone={TYPE_TONE[a.type]}>{a.type}</Badge>
        </div>
        <div className="flex flex-col gap-0.5">
          <p>
            <span className="text-muted">Date:</span> {day(a.date)} {time(a.date)}
          </p>
          <p>
            <span className="text-muted">Added by:</span> {a.addedBy}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Quantity</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {a.lines.map((l, i) => (
              <tr key={l.sku} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <p className="text-[13px]">
          <span className="text-muted">Reason:</span> {a.reason || "—"}
        </p>
        <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
          <dt className="text-muted">Total amount:</dt>
          <dd className="text-right tabular-nums">{USD.format(totals.total)}</dd>
          <dt className="text-muted">Total amount recovered:</dt>
          <dd className="text-right tabular-nums">(-) {USD.format(a.recovered)}</dd>
          <dt className="border-t border-line pt-1 font-semibold">Net loss:</dt>
          <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(Math.max(0, totals.total - a.recovered))}</dd>
        </dl>
      </div>
    </Modal>
  );
}
