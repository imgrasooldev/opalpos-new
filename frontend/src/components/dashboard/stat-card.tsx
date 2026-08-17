import type { Stat } from "@/components/dashboard/dashboard-data";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const TILES: Record<Stat["tone"], string> = {
  blue: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

/** Delta ka rang direction se aata hai — flat ko neutral rakha hai. */
const DELTAS: Record<Stat["delta"]["direction"], string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-muted",
};

export function StatCard({ stat }: { stat: Stat }) {
  const { delta } = stat;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-background p-4 shadow-sm shadow-navy-950/[0.03]">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          TILES[stat.tone],
        )}
      >
        <Icon name={stat.icon} className="h-5 w-5" />
      </span>

      <div className="min-w-0">
        <p className="text-[13px] text-muted">{stat.label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums">{stat.value}</p>

        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn("flex items-center gap-1 font-medium", DELTAS[delta.direction])}>
            {delta.direction !== "flat" && (
              <Icon
                name={delta.direction === "up" ? "trend-up" : "trend-down"}
                className="h-3.5 w-3.5"
              />
            )}
            {delta.direction === "flat" && <span aria-hidden>—</span>}
            {delta.value}
          </span>
          <span className="text-muted">vs previous 30 days</span>
        </p>
      </div>
    </div>
  );
}
