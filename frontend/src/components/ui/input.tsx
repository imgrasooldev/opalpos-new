import type { InputHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Backend ke 422 se aaya field error — `ApiError.fieldErrors()` dekho. */
  error?: string;
};

export function Input({ label, error, className, id, ...props }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          "rounded-md border px-3 py-2 text-sm outline-none transition-colors",
          "focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900",
          error
            ? "border-red-500"
            : "border-zinc-300 dark:border-zinc-700",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
