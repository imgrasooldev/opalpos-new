"use client";

/**
 * Cash denominations table: count each note, see the subtotals and the total.
 * The total turns green when it matches `target` (the amount being paid).
 */

import { cn } from "@/lib/cn";

export const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const cashTotal = (counts: Record<number, string>) =>
  DENOMINATIONS.reduce((t, d) => t + d * (Number(counts[d]) || 0), 0);

export function CashDenominations({
  counts,
  onChange,
  target,
}: {
  counts: Record<number, string>;
  onChange: (counts: Record<number, string>) => void;
  target: number;
}) {
  const total = cashTotal(counts);

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
        <p className="text-[13px] font-semibold">Cash denominations</p>
        <p className="text-xs text-muted">Optional: count the notes paid out</p>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-y border-line text-xs text-muted">
            <th scope="col" className="px-4 py-2 text-left font-medium">Denomination</th>
            <th scope="col" className="px-4 py-2 text-left font-medium">Count</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {DENOMINATIONS.map((d) => (
            <tr key={d} className="border-b border-line last:border-0">
              <td className="px-4 py-1.5 tabular-nums">
                {USD.format(d)} <span className="text-muted">×</span>
              </td>
              <td className="px-4 py-1.5">
                <input
                  aria-label={`Count of ${USD.format(d)}`}
                  inputMode="numeric"
                  value={counts[d] ?? ""}
                  onChange={(event) => onChange({ ...counts, [d]: event.target.value.replace(/\D/g, "") })}
                  placeholder="0"
                  className="w-24 rounded-md border border-line bg-background px-2 py-1 text-[13px] tabular-nums outline-none focus:border-brand-500"
                />
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums text-muted">
                {USD.format(d * (Number(counts[d]) || 0))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-surface font-semibold">
            <td className="px-4 py-2" colSpan={2}>
              Total
            </td>
            <td
              className={cn(
                "px-4 py-2 text-right tabular-nums",
                total > 0 && Math.abs(total - target) < 0.005 && "text-emerald-600",
              )}
            >
              {USD.format(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
