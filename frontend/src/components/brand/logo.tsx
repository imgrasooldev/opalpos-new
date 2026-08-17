/**
 * Brand lockup — mark (`src/assets/home-logo.png`) + wordmark.
 *
 * Image `public/` se nahi, import se aati hai: Next build par uska hash, width
 * aur height khud nikal leta hai (immutable caching + no layout shift).
 *
 * `tone` batata hai ke background halka hai ya gehra, taake wordmark ka rang
 * theek rahe. `href` do to poora lockup link ban jata hai.
 */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import logoMark from "@/assets/home-logo.png";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg";
type Tone = "dark" | "light";

/** Sirf height set hoti hai; width `auto` — mark square nahi hai. */
const MARK_SIZES: Record<Size, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

const WORDMARK_SIZES: Record<Size, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const TONES: Record<Tone, string> = {
  dark: "text-zinc-900 dark:text-zinc-50",
  light: "text-white",
};

type Props = {
  size?: Size;
  tone?: Tone;
  /** Link banana ho to route do; warna plain lockup render hota hai. */
  href?: string;
  showWordmark?: boolean;
  /** Header/hero mein logo pehla paint hota hai -> priority. */
  priority?: boolean;
  className?: string;
};

export function Logo({
  size = "md",
  tone = "dark",
  href,
  showWordmark = true,
  priority = false,
  className,
}: Props) {
  const content: ReactNode = (
    <>
      <Image
        src={logoMark}
        alt={showWordmark ? "" : BRAND.name}
        priority={priority}
        className={cn("w-auto", MARK_SIZES[size])}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight",
            WORDMARK_SIZES[size],
            TONES[tone],
          )}
        >
          {BRAND.name}
        </span>
      )}
    </>
  );

  const classes = cn("inline-flex items-center gap-2", className);

  if (href) {
    return (
      <Link href={href} className={cn(classes, "rounded-md")} aria-label={BRAND.name}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
