import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";
import { UserForm } from "@/components/users/user-form";

export const metadata: Metadata = {
  title: "Add user",
};

/** User Management -> Users -> Add user. Static for now, like the users list. */
export default function AddUserPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add user" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/users"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Users
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Add user</h1>
          <p className="mt-1 text-[13px] text-muted">
            Create a team member and choose what they can do.
          </p>
        </div>

        <UserForm />
      </div>
    </ConsoleShell>
  );
}
