/**
 * Chhota className joiner.
 *
 * `clsx`/`tailwind-merge` add nahi kiye — package.json chhota rakhna hai.
 * Falsy values skip ho jati hain, is liye conditional classes aasan:
 *
 *   cn("btn", isActive && "btn-active", disabled && "opacity-50")
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
