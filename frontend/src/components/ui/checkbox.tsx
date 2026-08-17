import type { InputHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

/**
 * Native checkbox — sirf `accent-color` se brand rang milta hai.
 *
 * Custom div-based checkbox jaan boojh kar nahi banaya: native wala keyboard,
 * form reset aur screen readers ke saath pehle se theek chalta hai.
 */
export function Checkbox({ label, className, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          "h-4 w-4 cursor-pointer rounded border-zinc-300 accent-brand-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-300"
      >
        {label}
      </label>
    </div>
  );
}
