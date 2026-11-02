import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PERMISSION_GROUPS } from "@/components/roles/permissions-data";
import { DEMO_ROLES } from "@/components/roles/roles-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { DEMO_USERS } from "@/components/users/users-data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "View role",
};

/**
 * Roles -> View. Read-only summary: who has the role and what it grants,
 * grouped like the role form. Groups the role has no access to are listed
 * separately so the granted ones stay easy to scan.
 */
export default async function ViewRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = DEMO_ROLES.find((r) => r.id === Number(id));
  if (!role) notFound();

  const { user, store, today } = DEMO_SESSION;
  const granted = new Set(role.permissions);
  const members = DEMO_USERS.filter((u) => u.role === role.name);

  const groups = PERMISSION_GROUPS.map((group) => ({
    ...group,
    items: group.blocks.flatMap((b) => b.items).filter((i) => granted.has(i.key)),
  }));
  const withAccess = groups.filter((g) => g.items.length > 0);
  const withoutAccess = groups.filter((g) => g.items.length === 0);

  return (
    <ConsoleShell section="View role" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <Link
          href="/roles"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Roles
        </Link>

        {/* role header */}
        <section className="rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  role.system
                    ? "bg-brand-gradient text-white"
                    : "bg-brand-50 text-brand-500 dark:bg-brand-900",
                )}
              >
                <Icon name={role.system ? "lock" : "users"} className="h-6 w-6" />
              </span>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                  {role.name}
                  {role.system && (
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-600 dark:bg-brand-900 dark:text-brand-200">
                      System
                    </span>
                  )}
                </h1>
                <p className="mt-1 text-[13px] text-muted">{role.description}</p>
              </div>
            </div>

            {role.system ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                <Icon name="lock" className="h-4 w-4" />
                Can&apos;t be changed
              </span>
            ) : (
              <Link
                href={`/roles/${role.id}/edit`}
                className={buttonStyles({ variant: "brand" })}
              >
                <Icon name="pencil" className="h-4 w-4" />
                Edit role
              </Link>
            )}
          </div>

          <dl className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-3">
            <Stat label="Users" value={members.length} />
            <Stat
              label="Permissions"
              value={role.system ? "All" : role.permissions.length}
            />
            <Stat
              label="Groups with access"
              value={role.system ? "All" : `${withAccess.length} / ${groups.length}`}
              className="hidden sm:block"
            />
          </dl>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
          <Card
            title={
              <div>
                <h2 className="text-sm font-semibold">Permissions</h2>
                <p className="mt-0.5 text-xs text-muted">What users with this role can do</p>
              </div>
            }
            bodyClassName="px-0 pb-0"
          >
            {role.system ? (
              <div className="flex items-start gap-3 border-t border-line px-5 py-5 text-[13px]">
                <Icon name="lock" className="mt-0.5 h-4 w-4 text-brand-500" />
                <p className="text-muted">
                  <span className="font-medium text-foreground">Full access.</span> Admins
                  skip permission checks and can use every screen and setting.
                </p>
              </div>
            ) : (
              <>
                {withAccess.map((group) => (
                  <section
                    key={group.key}
                    className="grid gap-3 border-t border-line px-5 py-4 md:grid-cols-[200px_1fr]"
                  >
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                      {group.label}
                      <span className="rounded bg-brand-50 px-1.5 text-[10.5px] font-normal tabular-nums text-brand-600 dark:bg-brand-900 dark:text-brand-200">
                        {group.items.length}
                      </span>
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <li
                          key={item.key}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

                {withoutAccess.length > 0 && (
                  <div className="border-t border-line px-5 py-4">
                    <p className="text-xs font-medium text-muted">No access</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                      {withoutAccess.map((g) => g.label).join(" · ")}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card
            title={
              <div>
                <h2 className="text-sm font-semibold">Users with this role</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {members.length} {members.length === 1 ? "person" : "people"}
                </p>
              </div>
            }
            bodyClassName="px-0 pb-0"
          >
            {members.length === 0 ? (
              <p className="border-t border-line px-5 py-6 text-center text-[13px] text-muted">
                Nobody has this role yet.
              </p>
            ) : (
              <ul>
                {members.map((member) => (
                  <li key={member.id} className="border-t border-line">
                    <Link
                      href={`/users/${member.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {member.name}
                        </span>
                        <span className="block truncate text-xs text-muted">{member.email}</span>
                      </span>
                      <Icon name="chevron-right" className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </ConsoleShell>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-3", className)}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function initials(name: string) {
  return name
    .replace(/^(Mr|Mrs|Miss|Ms)\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
