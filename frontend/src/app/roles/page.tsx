import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { DEMO_ROLES } from "@/components/roles/roles-data";
import { RolesTable } from "@/components/roles/roles-table";
import { ConsoleShell } from "@/components/shell/console-shell";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Roles",
};

/** User Management -> Roles. A static preview for now, like Users. */
export default function RolesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Roles" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Roles</h1>
            <p className="mt-1 text-[13px] text-muted">
              Manage roles and what each one is allowed to do.
            </p>
          </div>

          <Link href="/roles/create" className={buttonStyles({ variant: "brand" })}>
            <Icon name="plus" className="h-4 w-4" />
            Add role
          </Link>
        </div>

        <RolesTable roles={DEMO_ROLES} />
      </div>
    </ConsoleShell>
  );
}
