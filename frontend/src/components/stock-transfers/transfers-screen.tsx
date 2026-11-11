"use client";

/**
 * Stock Transfers -> List stock transfers, as in the old Opal POS: Date,
 * Reference no, Location (from), Location (to), Status, Shipping charges,
 * Total amount, Additional notes and Action.
 *
 * Actions: View (and Print), Update status (until it's Completed; Completed
 * logs the move in stock history) and Delete (undoes a completed move).
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { updateProducts } from "@/components/inventory/product-store";
import {
  TRANSFER_STATUSES,
  applyTransfer,
  transferTotals,
  updateTransfers,
  useTransfers,
  type StockTransfer,
  type TransferStatus,
} from "@/components/stock-transfers/transfers-data";
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
const STATUS_TONE = { Pending: "amber", "In transit": "blue", Completed: "green" } as const;

export function TransfersScreen() {
  const transfers = useTransfers();
  const [viewing, setViewing] = useState<{ id: number; print?: boolean } | null>(null);
  const [changing, setChanging] = useState<StockTransfer | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const columns: DataColumn<StockTransfer>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (t) => t.date,
      text: (t) => `${day(t.date)} ${time(t.date)}`,
      render: (t) => (
        <span className="leading-tight">
          <span className="block">{day(t.date)}</span>
          <span className="block text-xs text-muted">{time(t.date)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (t) => t.ref,
      text: (t) => t.ref,
      render: (t) => (
        <button type="button" onClick={() => setViewing({ id: t.id })} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {t.ref}
        </button>
      ),
    },
    { key: "from", label: "Location (from)", sortValue: (t) => t.from, text: (t) => t.from },
    {
      key: "to",
      label: "Location (to)",
      sortValue: (t) => t.to,
      text: (t) => t.to,
      render: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <Icon name="arrow-right" className="h-3.5 w-3.5 text-muted" />
          {t.to}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (t) => t.status,
      text: (t) => t.status,
      render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>,
    },
    {
      key: "shipping",
      label: "Shipping charges",
      sortValue: (t) => t.shipping,
      text: (t) => t.shipping.toFixed(2),
      render: (t) => <span className="tabular-nums">{USD.format(t.shipping)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((s, t) => s + t.shipping, 0)),
    },
    {
      key: "total",
      label: "Total amount",
      sortValue: (t) => transferTotals(t).total,
      text: (t) => transferTotals(t).total.toFixed(2),
      render: (t) => <span className="font-medium tabular-nums">{USD.format(transferTotals(t).total)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((s, t) => s + transferTotals(t).total, 0)),
    },
    {
      key: "notes",
      label: "Additional notes",
      sortValue: (t) => t.notes,
      text: (t) => t.notes,
      render: (t) => (t.notes ? <span className="block max-w-60 truncate" title={t.notes}>{t.notes}</span> : <span className="text-muted">-</span>),
    },
  ];

  const viewed = viewing && transfers.find((t) => t.id === viewing.id);

  return (
    <>
      <DataTable
        title="All stock transfers"
        subtitle={`${transfers.length} ${transfers.length === 1 ? "transfer" : "transfers"} · completed ones show in each product's stock history`}
        rows={transfers}
        columns={columns}
        rowKey={(t) => t.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="transfers"
        exportName="stock-transfers"
        minWidth={1100}
        headerAction={
          <Link
            href="/stock-transfers/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
        actions={(t) => (
          <ActionsMenu
            label={`Actions for ${t.ref}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing({ id: t.id }) },
              { label: "Print", icon: "printer", onClick: () => setViewing({ id: t.id, print: true }) },
              ...(t.status !== "Completed" ? [{ label: "Update status", icon: "truck" as const, onClick: () => setChanging(t) }] : []),
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message:
                      t.status === "Completed"
                        ? `${t.ref} will be deleted and its move undone in the stock history (${transferTotals(t).items} items back to ${t.from}).`
                        : `${t.ref} will be deleted.`,
                    onConfirm: () => {
                      updateTransfers((prev) => prev.filter((x) => x.id !== t.id));
                      if (t.status === "Completed") updateProducts((prev) => applyTransfer(prev, t, -1));
                    },
                  }),
              },
            ]}
          />
        )}
      />

      {viewed && <ViewDialog transfer={viewed} autoPrint={viewing?.print} onClose={() => setViewing(null)} />}

      {changing && (
        <StatusDialog
          key={changing.id}
          transfer={changing}
          onClose={() => setChanging(null)}
          onSave={(status) => {
            const next = { ...changing, status };
            updateTransfers((prev) => prev.map((x) => (x.id === changing.id ? next : x)));
            if (status === "Completed") updateProducts((prev) => applyTransfer(prev, next, 1));
            setChanging(null);
          }}
        />
      )}

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

function ViewDialog({ transfer: t, autoPrint, onClose }: { transfer: StockTransfer; autoPrint?: boolean; onClose: () => void }) {
  const totals = transferTotals(t);
  useEffect(() => {
    if (!autoPrint) return;
    // let the dialog paint before the print preview opens
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <Modal
      title={`Stock transfer details (Reference no: ${t.ref})`}
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
          <p className="text-xs text-muted">Location (from)</p>
          <p className="font-medium">{t.from}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Location (to)</p>
          <p className="font-medium">{t.to}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p>
            <span className="text-muted">Date:</span> {day(t.date)} {time(t.date)}
          </p>
          <p>
            <span className="text-muted">Status:</span> <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
          </p>
          <p>
            <span className="text-muted">Added by:</span> {t.addedBy}
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
            {t.lines.map((l, i) => (
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
          <span className="text-muted">Additional notes:</span> {t.notes || "-"}
        </p>
        <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
          <dt className="text-muted">Net total amount:</dt>
          <dd className="text-right tabular-nums">{USD.format(totals.subtotal)}</dd>
          <dt className="text-muted">Shipping charges:</dt>
          <dd className="text-right tabular-nums">(+) {USD.format(t.shipping)}</dd>
          <dt className="border-t border-line pt-1 font-semibold">Total amount:</dt>
          <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(totals.total)}</dd>
        </dl>
      </div>
    </Modal>
  );
}

function StatusDialog({
  transfer,
  onClose,
  onSave,
}: {
  transfer: StockTransfer;
  onClose: () => void;
  onSave: (status: TransferStatus) => void;
}) {
  const [status, setStatus] = useState<TransferStatus>(transfer.status);
  return (
    <Modal
      title="Update status"
      description={`${transfer.ref} · ${transfer.from} to ${transfer.to}`}
      onClose={onClose}
      className="max-w-sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={() => onSave(status)} disabled={status === transfer.status}>
            Update
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status *</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TransferStatus)}
          className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {TRANSFER_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {status === "Completed" && (
        <p className="mt-3 text-[13px] text-muted">
          {transferTotals(transfer).items} items will be logged as moved from {transfer.from} to {transfer.to}. A completed transfer can&apos;t be changed after.
        </p>
      )}
    </Modal>
  );
}
