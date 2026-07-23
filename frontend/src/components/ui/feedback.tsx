/**
 * Loading / error / empty states.
 *
 * Har list screen ko ye chaar surat dikhani chahiye: loading, error, empty,
 * data. Yahan ek jagah rakhne se har page mein dobara nahi likhni parti.
 */

import type { ReactNode } from "react";

import { ApiError } from "@/lib/api";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
      />
      {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  // ApiError mein backend ka asli message hota hai; baaki sab generic
  const message =
    error instanceof ApiError ? error.message : "Something went wrong";

  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </p>
      {description && (
        <p className="text-sm text-zinc-500">{description}</p>
      )}
      {action}
    </div>
  );
}
