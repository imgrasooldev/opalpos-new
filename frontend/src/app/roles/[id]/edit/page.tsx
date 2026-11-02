import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { RoleForm } from "@/components/roles/role-form";
import { DEMO_ROLES } from "@/components/roles/roles-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Edit role",
};

/**
 * Roles -> Edit. The same form as Add role, prefilled with the role's
 * permissions. System roles (Admin) can't be edited, so they 404.
 */
export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = DEMO_ROLES.find((r) => r.id === Number(id));
  if (!role || role.system) notFound();

  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Edit role" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/roles"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Roles
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Edit role</h1>
          <p className="mt-1 text-[13px] text-muted">
            Change what users with the {role.name} role can do.
          </p>
        </div>

        {/* key resets the form state when switching to another role */}
        <RoleForm key={role.id} role={role} />
      </div>
    </ConsoleShell>
  );
}
