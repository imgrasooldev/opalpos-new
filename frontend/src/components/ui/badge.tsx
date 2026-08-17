import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "green" | "amber" | "blue" | "rose" | "neutral";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  neutral: "bg-surface text-muted",
};

/** Chhota status/count pill — table ke status aur "3 due" jaise counts ke liye. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
