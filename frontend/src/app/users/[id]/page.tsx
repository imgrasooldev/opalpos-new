import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { PinReveal } from "@/components/users/pin-reveal";
import {
  ADMINS,
  DEMO_USERS,
  LOCATIONS,
  ROLE_TONE,
} from "@/components/users/users-data";

export const metadata: Metadata = {
  title: "View user",
};

/**
 * Users -> View. Read-only profile laid out in the same sections as the user
 * form, so what you see here maps one-to-one onto what Edit changes.
 * Looks the user up in demo data for now; `useUser(id)` replaces it later.
 */
export default async function ViewUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewed = DEMO_USERS.find((u) => u.id === Number(id));
  if (!viewed) notFound();

  const { user, store, today } = DEMO_SESSION;
  const isAdmin = viewed.role === "Admin";
  const locations = LOCATIONS.filter(
    (l) => isAdmin || viewed.locationIds.includes(l.id),
  );
  const admins = ADMINS.filter((a) => viewed.adminIds.includes(a.id));

  return (
    <ConsoleShell section="View user" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <Link
          href="/users"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Users
        </Link>

        {/* profile header */}
        <section className="rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-semibold text-white">
                {initials(viewed.name)}
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{viewed.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <Badge tone={ROLE_TONE[viewed.role]}>{viewed.role}</Badge>
                  <Badge tone="green">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    Active
                  </Badge>
                  <span>{viewed.email}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/users/${viewed.id}/edit`}
              className={buttonStyles({ variant: "brand" })}
            >
              <Icon name="pencil" className="h-4 w-4" />
              Edit user
            </Link>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Basic details">
            <dl className="divide-y divide-line">
              <Row label="Full name">{viewed.name}</Row>
              <Row label="Email">
                <a href={`mailto:${viewed.email}`} className="text-brand-500 hover:text-brand-600">
                  {viewed.email}
                </a>
              </Row>
              <Row label="Status">
                <span className="inline-flex items-center gap-1.5 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Active
                </span>
              </Row>
            </dl>
          </Card>

          <Card title="Roles and permissions">
            <dl className="divide-y divide-line">
              <Row label="Role">
                <Badge tone={ROLE_TONE[viewed.role]}>{viewed.role}</Badge>
              </Row>
              <Row label="Web login">
                {viewed.username ? (
                  <span className="font-mono text-[13px]">{viewed.username}</span>
                ) : (
                  <span className="text-muted">No web login, uses the POS PIN</span>
                )}
              </Row>
              <Row label="Access locations">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {locations.map((location) => (
                    <Chip key={location.id} icon="store">
                      {location.name}
                      <span className="font-mono text-[10px] text-muted">{location.id}</span>
                    </Chip>
                  ))}
                  {locations.length === 0 && <span className="text-muted">None</span>}
                </div>
              </Row>
            </dl>
          </Card>

          {!isAdmin && (
            <Card title="4 digit PIN-code">
              <dl className="divide-y divide-line">
                <Row label="POS PIN">
                  {viewed.pin ? (
                    // masked by default; the eye button reveals it
                    <span className="inline-flex items-center gap-2">
                      <PinReveal pin={viewed.pin} />
                      <Badge tone="green">Active</Badge>
                    </span>
                  ) : (
                    <span className="text-muted">Not set</span>
                  )}
                </Row>
                <Row label="Assigned admins">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {admins.map((admin) => (
                      <Chip key={admin.id} icon="users">
                        {admin.name}
                      </Chip>
                    ))}
                    {admins.length === 0 && <span className="text-muted">None</span>}
                  </div>
                </Row>
              </dl>
            </Card>
          )}

          <Card title="Sales">
            <dl className="divide-y divide-line">
              <Row label="Commission">
                <span className="text-lg font-semibold tabular-nums">
                  {viewed.commission.toFixed(2)}%
                </span>
              </Row>
              <Row label="Applies to">
                <span className="text-muted">Every sale this user makes</span>
              </Row>
            </dl>
          </Card>
        </div>
      </div>
    </ConsoleShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 text-[13px] first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Chip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs">
      <Icon name={icon} className="h-3.5 w-3.5 text-muted" />
      {children}
    </span>
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
