"use client";

import { Input } from "@/components/ui/input";

/**
 * "Controlled" component — apna state nahi rakhta, parent se value leta hai
 * aur change parent ko wapas deta hai. Isi liye page filters ko query key
 * mein daal sakta hai.
 */
export function ProductFilters({
  search,
  onSearchChange,
  onlyActive,
  onOnlyActiveChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onlyActive: boolean;
  onOnlyActiveChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-64 flex-1">
        <Input
          label="Search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name or SKU"
        />
      </div>

      <label className="flex items-center gap-2 pb-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={onlyActive}
          onChange={(e) => onOnlyActiveChange(e.target.checked)}
          className="h-4 w-4"
        />
        Only active
      </label>
    </div>
  );
}
