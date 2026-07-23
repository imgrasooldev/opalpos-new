import type { ReactNode, ThHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    // wrapper: chhoti screen par table scroll ho, page nahi
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th className={cn("py-2 font-medium", className)} {...props}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={cn("py-2.5", className)}>{children}</td>;
}
