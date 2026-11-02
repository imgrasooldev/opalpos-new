"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";

/** POS PIN that stays masked until the eye button is pressed. */
export function PinReveal({ pin }: { pin: string }) {
  const [shown, setShown] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="min-w-[4.5ch] text-right font-mono tracking-[0.3em]"
        aria-live="polite"
      >
        {shown ? pin : "••••"}
      </span>
      <button
        type="button"
        aria-label={shown ? "Hide PIN" : "Show PIN"}
        aria-pressed={shown}
        title={shown ? "Hide PIN" : "Show PIN"}
        onClick={() => setShown((v) => !v)}
        className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <Icon name={shown ? "eye-off" : "eye"} className="h-4 w-4" />
      </button>
    </span>
  );
}
