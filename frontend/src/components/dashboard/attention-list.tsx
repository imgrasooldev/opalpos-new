import { ATTENTION_ITEMS } from "@/components/dashboard/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const TILES = {
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-brand-50 text-brand-600",
} as const;

export function AttentionList() {
  return (
    <Card title="Attention needed" bodyClassName="px-2 pb-3">
      <ul className="flex flex-col">
        {ATTENTION_ITEMS.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                TILES[item.tone],
              )}
            >
              <Icon name={item.icon} className="h-4 w-4" />
            </span>

            <span className="flex-1 text-[13px]">{item.label}</span>

            <Badge tone={item.tone}>{item.count}</Badge>

            <a
              href="/sales"
              className="text-[13px] font-medium text-brand-500 hover:text-brand-600"
            >
              View all
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
