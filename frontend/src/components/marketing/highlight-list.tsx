/**
 * Hero ke neeche teen chhoti value props — icon + title + ek line.
 */

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type Highlight = {
  icon: IconName;
  title: string;
  description: string;
};

export function HighlightList({
  items,
  id,
  className,
}: {
  items: Highlight[];
  /** Anchor link (`#features`) ke liye. */
  id?: string;
  className?: string;
}) {
  return (
    // columns stretch nahi karte — reference mein teeno ek dusre ke qareeb hain
    <ul id={id} className={cn("flex flex-wrap gap-x-12 gap-y-8", className)}>
      {items.map((item) => (
        <li key={item.title} className="flex flex-col">
          <Icon name={item.icon} className="h-5 w-5 text-aqua-300" />
          <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-[13px] text-white/55">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
