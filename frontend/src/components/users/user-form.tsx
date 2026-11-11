"use client";

/**
 * User form, with the same sections and order as the old Opal POS:
 * basic details -> roles & permissions -> 4 digit PIN -> sales.
 *
 * Sections change with the role, as in the old form:
 *   - Cashiers never log in, they open the POS with a PIN -> no "Allow login"
 *   - Admins have no PIN -> no PIN section
 *
 * Add and Edit share this form. Pass `user` and every field starts with that
 * user's value; leaving the password blank keeps the current one.
 *
 * STATIC FOR NOW: Save only runs client-side validation and sends no request.
 * Once the users endpoint exists, `handleSubmit` calls a mutation.
 */

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  ADMINS,
  LOCATIONS,
  ROLES,
  type DemoUser,
  type RoleName,
} from "@/components/users/users-data";
import { cn } from "@/lib/cn";

type Errors = Partial<
  Record<
    "firstName" | "email" | "username" | "password" | "confirm" | "pin" | "admins" | "commission",
    string
  >
>;

/** Demo data stores the full name in one field — split it for the three form inputs. */
function splitName(name: string) {
  const match = name.match(/^(Mr|Mrs|Miss|Ms)\.?\s+(.*)$/i);
  const prefix = match ? match[1] : "";
  const [firstName = "", ...rest] = (match ? match[2] : name).split(/\s+/);
  return { prefix, firstName, lastName: rest.join(" ") };
}

export function UserForm({ user }: { user?: DemoUser }) {
  const editing = Boolean(user);
  const name = splitName(user?.name ?? "");

  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [role, setRole] = useState<RoleName>(user?.role ?? "Admin");
  const [allowLogin, setAllowLogin] = useState(Boolean(user?.username));
  const [locations, setLocations] = useState<string[]>(user?.locationIds ?? []);
  const [allowPin, setAllowPin] = useState(user ? Boolean(user.pin) : true);
  const [admins, setAdmins] = useState<number[]>(user?.adminIds ?? []);
  const [pin, setPin] = useState(user?.pin ?? "");

  const isAdmin = role === "Admin";
  const isCashier = role === "Cashier";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();

    const next: Errors = {};
    if (!value("firstName")) next.firstName = "First name is required";
    if (!/^\S+@\S+\.\S+$/.test(value("email")))
      next.email = "Enter a valid email address";

    if (allowLogin && !isCashier) {
      if (!value("username")) next.username = "Choose a username";
      // when editing, a blank password keeps the current one; a user without a login yet needs one
      const keepPassword = Boolean(user?.username) && !value("password");
      if (!keepPassword && value("password").length < 8)
        next.password = "Use at least 8 characters";
      if (value("password") !== value("confirm"))
        next.confirm = "Passwords don't match";
    }

    if (!isAdmin && allowPin) {
      if (!/^\d{4}$/.test(pin)) next.pin = "PIN must be exactly 4 digits";
      if (admins.length === 0) next.admins = "Assign at least one admin";
    }

    const commission = value("commission");
    if (commission && !(Number(commission) >= 0 && Number(commission) <= 100))
      next.commission = "Enter a value between 0 and 100";

    setErrors(next);
    setSaved(Object.keys(next).length === 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {saved && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <Icon name="alert" className="h-4 w-4" />
          {editing ? "Changes look good" : "Looks good"}. This is a demo screen,
          so nothing was sent to the server yet.
        </div>
      )}

      <Section title="Basic details" description="Who this person is and how to reach them.">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr_1fr]">
          <Input
            name="prefix"
            label="Prefix"
            placeholder="Mr / Mrs / Miss"
            defaultValue={name.prefix}
          />
          <Input
            name="firstName"
            label="First name *"
            placeholder="First name"
            defaultValue={name.firstName}
            error={errors.firstName}
          />
          <Input
            name="lastName"
            label="Last name"
            placeholder="Last name"
            defaultValue={name.lastName}
          />
        </div>

        <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
          <Input
            name="email"
            type="email"
            label="Email *"
            placeholder="name@business.com"
            defaultValue={user?.email}
            error={errors.email}
          />
          <div className="pb-2.5">
            <Checkbox name="active" label="Is active" defaultChecked />
          </div>
        </div>
      </Section>

      <Section
        title="Roles and permissions"
        description="What they can do and which locations they can see."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Role *"
            hint={
              isCashier
                ? "Cashiers open the POS with a 4 digit PIN, no web login."
                : isAdmin
                  ? "Admins have full access to every screen."
                  : "Permissions come from the role. Edit them under Roles."
            }
            value={role}
            onChange={(next) => setRole(next as RoleName)}
            options={ROLES}
          />
        </div>

        <Reveal show={!isCashier}>
          <div className="pt-4">
            <Checkbox
              label="Allow login"
              checked={allowLogin}
              onChange={(event) => setAllowLogin(event.target.checked)}
            />
          </div>

          <Reveal show={allowLogin}>
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              <Input
                name="username"
                label="Username *"
                placeholder="e.g. sara.manager"
                autoComplete="off"
                defaultValue={user?.username ?? undefined}
                error={errors.username}
              />
              <Input
                name="password"
                type="password"
                label={user?.username ? "New password" : "Password *"}
                placeholder={user?.username ? "Leave blank to keep current" : undefined}
                autoComplete="new-password"
                error={errors.password}
              />
              <Input
                name="confirm"
                type="password"
                label={user?.username ? "Confirm new password" : "Confirm password *"}
                autoComplete="new-password"
                error={errors.confirm}
              />
            </div>
          </Reveal>
        </Reveal>

        <fieldset className="mt-5 border-t border-line pt-4">
          <legend className="sr-only">Access locations</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Access locations</p>
            <p className="text-xs text-muted">
              {isAdmin
                ? "Admins can access every location."
                : "Pick the locations this person works at."}
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {LOCATIONS.map((location) => {
              const checked = isAdmin || locations.includes(location.id);

              return (
                <label
                  key={location.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] transition-colors",
                    checked
                      ? "border-brand-500/40 bg-brand-50/60 dark:bg-brand-900/30"
                      : "border-line hover:bg-surface",
                    isAdmin ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isAdmin}
                    onChange={() =>
                      setLocations((prev) =>
                        prev.includes(location.id)
                          ? prev.filter((id) => id !== location.id)
                          : [...prev, location.id],
                      )
                    }
                    className="h-4 w-4 accent-brand-500"
                  />
                  <Icon name="store" className="h-4 w-4 text-muted" />
                  <span className="flex-1">{location.name}</span>
                  <span className="font-mono text-[11px] text-muted">{location.id}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      <Reveal show={!isAdmin}>
        <Section
          title="Allow 4 digit PIN-code"
          description="A quick PIN for signing in at the POS terminal."
        >
          <Checkbox
            label="Allow 4 digit PIN"
            checked={allowPin}
            onChange={(event) => setAllowPin(event.target.checked)}
          />

          <Reveal show={allowPin}>
            <div className="grid gap-4 pt-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Assign admin(s) *
                </p>
                <div className="flex flex-wrap gap-2">
                  {ADMINS.map((admin) => {
                    const selected = admins.includes(admin.id);

                    return (
                      <button
                        key={admin.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setAdmins((prev) =>
                            selected
                              ? prev.filter((id) => id !== admin.id)
                              : [...prev, admin.id],
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-all",
                          selected
                            ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                            : "border-line text-muted hover:border-brand-500/50 hover:text-foreground",
                        )}
                      >
                        <Icon
                          name={selected ? "close" : "plus"}
                          className="h-3.5 w-3.5"
                        />
                        {admin.name}
                      </button>
                    );
                  })}
                </div>
                <p className={cn("text-xs", errors.admins ? "text-red-600" : "text-muted")}>
                  {errors.admins ?? "Select one or more admins to assign to this user."}
                </p>
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
                <Input
                  name="pin"
                  label="4 digit PIN *"
                  placeholder="e.g. 1234"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  error={errors.pin}
                  className="font-mono tracking-[0.3em]"
                  trailing={
                    <button
                      type="button"
                      onClick={() =>
                        setPin(String(Math.floor(Math.random() * 10_000)).padStart(4, "0"))
                      }
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900"
                    >
                      Generate
                    </button>
                  }
                />
                <div className="sm:pt-8">
                  <Checkbox name="pinActive" label="PIN is active" defaultChecked />
                </div>
              </div>
            </div>
          </Reveal>
        </Section>
      </Reveal>

      <Section title="Sales" description="Commission earned on the sales this person makes.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="commission"
            label="Sales commission percentage"
            placeholder="0.00"
            inputMode="decimal"
            defaultValue={user?.commission.toFixed(2)}
            error={errors.commission}
            trailing={<span className="px-1 text-sm">%</span>}
          />
        </div>
      </Section>

      {/* action bar stays pinned at the bottom of the long form */}
      <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-xl border border-line bg-background/90 px-4 py-3 shadow-lg shadow-navy-950/[0.06] backdrop-blur">
        <Link href="/users" className={buttonStyles({ variant: "secondary" })}>
          Cancel
        </Link>
        <Button type="submit" variant="brand">
          {editing ? "Update user" : "Save user"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card
      title={
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
      }
      bodyClassName="border-t border-line pt-4"
    >
      {children}
    </Card>
  );
}

/**
 * Smoothly shows/hides a section, using the sidebar's grid-rows 0fr -> 1fr
 * trick. The hidden part is `inert` so Tab skips its fields.
 */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <div
      inert={!show}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
