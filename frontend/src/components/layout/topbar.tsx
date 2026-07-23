"use client";

import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/hooks/use-auth";

export function Topbar() {
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <div className="text-sm text-zinc-500">{me?.business?.name}</div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm leading-tight">
          <div className="font-medium">{me?.full_name ?? me?.email}</div>
          {me?.role && (
            <div className="text-xs text-zinc-500">{me.role.name}</div>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
