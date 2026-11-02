import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { RoleForm } from "@/components/roles/role-form";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Add role",
};

/** User Management -> Roles -> Add role. Static for now, like the roles list. */
export default function AddRolePage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add role" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/roles"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Roles
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Add role</h1>
          <p className="mt-1 text-[13px] text-muted">
            Name the role and choose exactly what its users can do.
          </p>
        </div>

        <RoleForm />
      </div>
    </ConsoleShell>
  );
}
