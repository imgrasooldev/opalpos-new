import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant =
  | "brand"
  | "accent"
  | "primary"
  | "secondary"
  | "inverse"
  | "danger"
  | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Asli CTA — poore product mein ek hi gradient.
  //
  // Do baatein isay flat gradient se behtar banati hain: upar se neeche ek
  // halki si white sheen (`before`), aur rang ka apna soft shadow — is liye
  // button surface se uthta hua lagta hai, chamakta hua nahi.
  brand: [
    "bg-brand-gradient-sheen text-white",
    "shadow-[0_8px_20px_-10px_rgb(43_72_190_/_0.75)]",
    "hover:shadow-[0_10px_24px_-10px_rgb(43_72_190_/_0.85)] hover:brightness-[1.05]",
    "active:brightness-[0.97] active:shadow-[0_4px_12px_-8px_rgb(43_72_190_/_0.8)]",
  ].join(" "),
  // header jaisi jagah jahan gradient bhaari lage — flat brand blue
  accent:
    "bg-brand-500 text-white shadow-[0_6px_16px_-8px_rgb(43_72_190_/_0.85)] hover:bg-brand-600 hover:shadow-[0_8px_18px_-8px_rgb(43_72_190_/_0.95)]",
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "border border-line bg-background text-foreground shadow-sm shadow-navy-950/[0.04] hover:bg-surface",
  // gehre panels (hero, auth ka brand side) par outline
  inverse: "border border-white/30 text-white hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

/**
 * Sirf classes — `<Link>` ko button jaisa dikhana ho to ye use karo, taake
 * button ke andar anchor nest na karna pare.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      // loading ke dauran dobara submit na ho
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
