"use client";

/**
 * Platform admin -> Platform users: the platform team's own logins (not
 * business users). Roles: Super admin, Support, Billing.
 *
 * Add / Edit in a popup (a password on Add), Activate / Deactivate and
 * Delete. You can't deactivate or delete yourself, and the last active
 * Super admin always stays.
 */

import { useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  PLATFORM_ROLES,
  ROLE_HELP,
  fmtDate,
  today,
  updatePlatformUsers,
  usePlatformUsers,
  type PlatformRole,
  type PlatformUser,
} from "@/components/platform/platform-data";
import { Field, Select, Toggle, inputClass } from "@/components/platform/platform-ui";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

/** The signed-in admin, until auth is wired up. */
const ME = 1;
const ROLE_TONE: Record<PlatformRole, "blue" | "green" | "amber"> = { "Super admin": "blue", Support: "green", Billing: "amber" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PlatformUsersScreen() {
  const hydrated = useHydrated();
  const users = usePlatformUsers();
  const [editing, setEditing] = useState<{ user?: PlatformUser } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const superAdmins = users.filter((u) => u.role === "Super admin" && u.active);
  /** Why this user can't lose admin access, or null. */
  const guard = (u: PlatformUser) =>
    u.id === ME ? "You can't remove your own access." : u.role === "Super admin" && u.active && superAdmins.length === 1 ? `${u.name} is the last active Super admin.` : null;

  const columns: DataColumn<PlatformUser>[] = [
    {
      key: "name",
      label: "Name",
      sortValue: (u) => u.name,
      text: (u) => `${u.name} ${u.email}`,
      render: (u) => (
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
            {u.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="leading-tight">
            <span className="block font-medium">
              {u.name}
              {u.id === ME && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
            </span>
            <span className="block text-xs text-muted">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", label: "Role", sortValue: (u) => u.role, text: (u) => u.role, render: (u) => <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge> },
    {
      key: "twoFactor",
      label: "Two-step login",
      sortValue: (u) => (u.twoFactor ? 1 : 0),
      text: (u) => (u.twoFactor ? "On" : "Off"),
      render: (u) => (
        <span className={cn("inline-flex items-center gap-1.5", u.twoFactor ? "text-emerald-600" : "text-amber-600")}>
          <Icon name={u.twoFactor ? "shield" : "alert"} className="h-4 w-4" />
          {u.twoFactor ? "On" : "Off"}
        </span>
      ),
    },
    { key: "lastLogin", label: "Last login", sortValue: (u) => u.lastLogin, text: (u) => fmtDate(u.lastLogin), render: (u) => <span className="whitespace-nowrap">{fmtDate(u.lastLogin)}</span> },
    { key: "created", label: "Added", sortValue: (u) => u.createdAt, text: (u) => fmtDate(u.createdAt), render: (u) => <span className="whitespace-nowrap text-muted">{fmtDate(u.createdAt)}</span> },
    { key: "status", label: "Status", sortValue: (u) => (u.active ? 1 : 0), text: (u) => (u.active ? "Active" : "Inactive"), render: (u) => <Badge tone={u.active ? "green" : "neutral"}>{u.active ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORM_ROLES.map((r) => (
          <Card key={r}>
            <div className="flex items-start gap-3">
              <Badge tone={ROLE_TONE[r]}>{r}</Badge>
              <span className="ml-auto text-xs text-muted">{hydrated ? users.filter((u) => u.role === r).length : "…"} users</span>
            </div>
            <p className="mt-2 text-[13px] text-muted">{ROLE_HELP[r]}</p>
          </Card>
        ))}
      </div>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <DataTable
          title="Platform users"
          subtitle="People who can sign in to this console"
          rows={users}
          columns={columns}
          rowKey={(u) => u.id}
          defaultSort={{ key: "name", direction: "asc" }}
          defaultPageSize={25}
          noun="users"
          exportName="platform-users"
          minWidth={900}
          rowClassName={(u) => (!u.active ? "opacity-60" : undefined)}
          headerAction={
            <Button type="button" variant="brand" onClick={() => setEditing({})}>
              <Icon name="plus" className="h-4 w-4" />
              Add user
            </Button>
          }
          actions={(u) => (
            <ActionsMenu
              label={`Actions for ${u.name}`}
              actions={[
                { label: "Edit", icon: "pencil", onClick: () => setEditing({ user: u }) },
                u.active
                  ? {
                      label: "Deactivate",
                      icon: "lock",
                      onClick: () =>
                        guard(u)
                          ? setBlocked(guard(u))
                          : setConfirm({
                              tone: "warning",
                              confirmLabel: "Deactivate",
                              message: `${u.name} won't be able to sign in to the platform console.`,
                              onConfirm: () => updatePlatformUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: false } : x))),
                            }),
                    }
                  : {
                      label: "Activate",
                      icon: "check",
                      onClick: () => updatePlatformUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: true } : x))),
                    },
                {
                  label: "Delete",
                  icon: "trash",
                  danger: true,
                  dividerBefore: true,
                  onClick: () =>
                    guard(u)
                      ? setBlocked(guard(u))
                      : setConfirm({
                          tone: "danger",
                          confirmLabel: "Delete",
                          message: `${u.name} (${u.email}) will be removed from the platform team.`,
                          onConfirm: () => updatePlatformUsers((prev) => prev.filter((x) => x.id !== u.id)),
                        }),
                },
              ]}
            />
          )}
        />
      )}

      {editing && (
        <UserDialog
          key={editing.user?.id ?? "new"}
          user={editing.user}
          all={users}
          lockedRole={editing.user ? Boolean(guard(editing.user)) && editing.user.role === "Super admin" : false}
          onClose={() => setEditing(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
      {blocked && (
        <Modal
          title="Can't do that"
          onClose={() => setBlocked(null)}
          className="max-w-sm"
          footer={
            <Button type="button" variant="secondary" onClick={() => setBlocked(null)}>
              OK
            </Button>
          }
        >
          <p className="text-[13px] text-muted">{blocked} The platform always needs an active Super admin.</p>
        </Modal>
      )}
    </div>
  );
}

function UserDialog({ user, all, lockedRole, onClose }: { user?: PlatformUser; all: PlatformUser[]; lockedRole: boolean; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<PlatformRole>(user?.role ?? "Support");
  const [twoFactor, setTwoFactor] = useState(user?.twoFactor ?? true);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email";
    else if (all.some((u) => u.id !== user?.id && u.email.toLowerCase() === email.trim().toLowerCase())) next.email = "This email is already on the team";
    if (!user && password.length < 8) next.password = "At least 8 characters";
    setErrors(next);
    if (Object.keys(next).length) return;
    updatePlatformUsers((prev) =>
      user
        ? prev.map((u) => (u.id === user.id ? { ...u, name: name.trim(), email: email.trim(), role, twoFactor } : u))
        : [
            ...prev,
            { id: Math.max(0, ...prev.map((u) => u.id)) + 1, name: name.trim(), email: email.trim(), role, twoFactor, active: true, lastLogin: "", createdAt: today() },
          ],
    );
    onClose();
  }

  return (
    <Modal
      title={user ? "Edit platform user" : "Add platform user"}
      description="Platform users manage businesses and plans. They aren't part of any business."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {user ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Full name *" error={errors.name}>
          <input aria-label="Full name" value={name} onChange={(event) => setName(event.target.value)} className={cn(inputClass, errors.name && "border-red-500")} />
        </Field>
        <Field label="Email *" error={errors.email}>
          <input aria-label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={cn(inputClass, errors.email && "border-red-500")} />
        </Field>
        <Field label="Role *" hint={lockedRole ? "The last active Super admin keeps this role." : ROLE_HELP[role]}>
          <Select label="Role" value={role} disabled={lockedRole} onChange={(v) => setRole(v as PlatformRole)}>
            {PLATFORM_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        {!user && (
          <Field label="Password *" error={errors.password} hint="They can change it after the first sign-in.">
            <input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={cn(inputClass, errors.password && "border-red-500")} />
          </Field>
        )}
        <Toggle checked={twoFactor} onChange={setTwoFactor} label="Require two-step login" hint="A code from an authenticator app on every sign-in" />
      </div>
    </Modal>
  );
}
