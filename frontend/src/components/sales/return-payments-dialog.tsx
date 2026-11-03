"use client";

/**
 * "View payments" for a sell return, laid out like the old popup: customer,
 * business and invoice details, "+ Add payment", then the refunds made
 * (date, reference, amount, method, note) with a delete action, and Print.
 */

import type { DemoCustomer } from "@/components/contacts/customers-data";
import { DEMO_BUSINESS } from "@/components/contacts/customers-data";
import { sellReturnTotals, type Sale, type SellReturn } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const STATUS_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;

export function ReturnPaymentsDialog({
  ret,
  sale,
  customer,
  onAdd,
  onDelete,
  onClose,
}: {
  ret: SellReturn;
  sale?: Sale;
  customer?: DemoCustomer;
  onAdd: () => void;
  /** Index of the refund in `ret.refunds`. */
  onDelete: (index: number) => void;
  onClose: () => void;
}) {
  const t = sellReturnTotals(ret);
  const status = t.due <= 0 ? "Paid" : t.refunded > 0 ? "Partial" : "Due";

  return (
    <Modal
      title={`View payments (Invoice no: ${ret.ref})`}
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
          <p className="text-xs text-muted">Customer</p>
          <p className="font-medium">{customer?.name ?? "Unknown customer"}</p>
          {customer?.businessName && <p className="text-muted">{customer.businessName}</p>}
          {customer?.mobile && <p className="text-muted">{customer.mobile}</p>}
        </div>
        <div>
          <p className="text-xs text-muted">Business</p>
          <p className="font-medium">{DEMO_BUSINESS.name}</p>
          <p className="text-muted">
            {sale?.location && <>{sale.location}<br /></>}
            {DEMO_BUSINESS.lines.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
            {ret.tax && <span className="block">{ret.tax}</span>}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p>
            <span className="text-muted">Invoice no:</span> <span className="font-mono font-medium">#{ret.ref}</span>
          </p>
          <p>
            <span className="text-muted">Date:</span> <span className="font-medium">{day(ret.date)}</span>
          </p>
          <p>
            <span className="text-muted">Payment status:</span> <Badge tone={STATUS_TONE[status]}>{status}</Badge>
          </p>
          <p>
            <span className="text-muted">Due:</span> <span className="font-medium tabular-nums">{USD.format(t.due)}</span> of{" "}
            {USD.format(t.total)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="brand" size="sm" onClick={onAdd} disabled={t.due <= 0} title={t.due <= 0 ? "Fully refunded" : undefined}>
          <Icon name="plus" className="h-4 w-4" />
          Add payment
        </Button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Reference no</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Payment method</th>
              <th className="px-3 py-2 font-medium">Payment note</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ret.refunds.map((p, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  {day(p.date)} <span className="text-muted">{time(p.date)}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{p.ref ?? "—"}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(p.amount)}</td>
                <td className="px-3 py-2">{p.method}</td>
                <td className="px-3 py-2 text-muted">{p.note || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label={`Delete payment ${p.ref ?? i + 1}`}
                    onClick={() => onDelete(i)}
                    className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {ret.refunds.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
