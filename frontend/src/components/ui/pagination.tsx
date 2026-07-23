"use client";

import type { ApiMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";

/**
 * Backend ke `meta` ({total, page, size, pages}) se seedha chalta hai —
 * har list page ismein wahi object pass karta hai jo API ne diya.
 */
export function Pagination({
  meta,
  onPageChange,
}: {
  meta: ApiMeta | null | undefined;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.pages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      <span className="text-zinc-500">
        Page {meta.page} of {meta.pages} ({meta.total} total)
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={meta.page >= meta.pages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
