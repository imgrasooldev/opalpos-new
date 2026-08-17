import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Dashboard ka basic panel — white surface, halka border, thora radius.
 *
 * `title` do to header row bhi ban jata hai; `action` us row ke dayen kone mein
 * baithta hai (filter, "View all" link waghera).
 */
export function Card({
  title,
  action,
  children,
  bodyClassName,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          {typeof title === "string" ? (
            <h2 className="text-sm font-semibold">{title}</h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}

      <div className={cn("flex-1 px-5 pb-5", !title && !action && "pt-5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
