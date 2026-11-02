import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";
import { UserForm } from "@/components/users/user-form";
import { DEMO_USERS } from "@/components/users/users-data";

export const metadata: Metadata = {
  title: "Edit user",
};

/**
 * Users -> Edit. The same form as Add user, prefilled with this user's values.
 * Looks the user up in demo data for now; `useUser(id)` replaces it later.
 */
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const editing = DEMO_USERS.find((u) => u.id === Number(id));
  if (!editing) notFound();

  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Edit user" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/users"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Users
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Edit user</h1>
          <p className="mt-1 text-[13px] text-muted">
            Update {editing.name}&apos;s details, role and access.
          </p>
        </div>

        {/* key resets the form state when switching to another user */}
        <UserForm key={editing.id} user={editing} />
      </div>
    </ConsoleShell>
  );
}
