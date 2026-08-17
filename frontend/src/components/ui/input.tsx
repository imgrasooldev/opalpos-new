import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Backend ke 422 se aaya field error — `ApiError.fieldErrors()` dekho. */
  error?: string;
  /** Error na ho to dikhne wali madad. */
  hint?: string;
  /** Field ke andar bayen taraf ka icon (sirf decoration). */
  leading?: ReactNode;
  /** Dayen taraf ka icon ya button (masalan password ka eye toggle). */
  trailing?: ReactNode;
};

export function Input({
  label,
  error,
  hint,
  leading,
  trailing,
  className,
  id,
  ...props
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

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

      {/* group -> focus par border/ring poore wrapper par lagti hai */}
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            {leading}
          </span>
        )}

        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors",
            "placeholder:text-zinc-400 dark:bg-navy-900 dark:text-zinc-100",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
            Boolean(leading) && "pl-10",
            Boolean(trailing) && "pr-10",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
              : "border-zinc-300 dark:border-navy-700",
            className,
          )}
          {...props}
        />

        {trailing && (
          <span className="absolute inset-y-0 right-2 flex items-center text-zinc-400">
            {trailing}
          </span>
        )}
      </div>

      {message && (
        <p
          id={messageId}
          className={cn("text-xs", error ? "text-red-600" : "text-muted")}
        >
          {message}
        </p>
      )}
    </div>
  );
}
