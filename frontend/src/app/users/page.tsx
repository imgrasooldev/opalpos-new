import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DEMO_USERS } from "@/components/users/users-data";
import { UsersTable } from "@/components/users/users-table";

export const metadata: Metadata = {
  title: "Users",
};

/**
 * User Management -> Users. A static preview for now, like the dashboard.
 *
 * Data comes from `components/users/users-data.ts`. Once the backend is wired
 * up, a hook goes there and this page gets `AuthGuard` +
 * `PermissionGate("user.view")`.
 */
export default function UsersPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Users" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Users</h1>
            <p className="mt-1 text-[13px] text-muted">
              Manage who can sign in, their roles and sales commission.
            </p>
          </div>

          <Link href="/users/create" className={buttonStyles({ variant: "brand" })}>
            <Icon name="plus" className="h-4 w-4" />
            Add user
          </Link>
        </div>

        <UsersTable users={DEMO_USERS} />
      </div>
    </ConsoleShell>
  );
}
