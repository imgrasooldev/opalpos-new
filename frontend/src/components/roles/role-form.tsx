"use client";

/**
 * Add/Edit role form: a role name plus the permission catalog, one row per
 * group in the old screen's order.
 *
 * Extras over the old screen, because the list is long: a sticky group index
 * with selected counts, a search box that filters permissions, and
 * select/clear-everything buttons.
 *
 * STATIC FOR NOW: Save only validates the name and sends no request. Once the
 * roles endpoint exists, `handleSubmit` posts `selectedKeys()`.
 */

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_GROUPS,
  type PermissionGroup,
} from "@/components/roles/permissions-data";
import type { DemoRole } from "@/components/roles/roles-data";
import { cn } from "@/lib/cn";

/** Radio block id -> chosen option key. */
type RadioState = Record<string, string | undefined>;

function initialState(keys: string[]) {
  const wanted = new Set(keys);
  const checks = new Set<string>();
  const radios: RadioState = {};
  for (const group of PERMISSION_GROUPS) {
    for (const block of group.blocks) {
      for (const item of block.items) {
        if (!wanted.has(item.key)) continue;
        if (block.kind === "check") checks.add(item.key);
        else radios[block.id] = item.key;
      }
    }
  }
  return { checks, radios };
}

export function RoleForm({ role }: { role?: DemoRole }) {
  const editing = Boolean(role);
  const [initial] = useState(() =>
    initialState(role ? role.permissions : DEFAULT_PERMISSIONS),
  );

  const [checks, setChecks] = useState<Set<string>>(initial.checks);
  const [radios, setRadios] = useState<RadioState>(initial.radios);
  const [search, setSearch] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const term = search.trim().toLowerCase();

  // groups (and their items) left after the search filter
  const visibleGroups = useMemo(() => {
    if (!term) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.flatMap((group) => {
      if (group.label.toLowerCase().includes(term)) return [group];
      const blocks = group.blocks
        .map((block) => ({
          ...block,
          items: block.items.filter((i) => i.label.toLowerCase().includes(term)),
        }))
        .filter((block) => block.items.length > 0);
      return blocks.length ? [{ ...group, blocks }] : [];
    });
  }, [term]);

  function counts(group: PermissionGroup) {
    let selected = 0;
    let total = 0;
    for (const block of group.blocks) {
      if (block.kind === "check") {
        total += block.items.length;
        selected += block.items.filter((i) => checks.has(i.key)).length;
      } else {
        total += 1;
        if (radios[block.id]) selected += 1;
      }
    }
    return { selected, total };
  }

  const totals = PERMISSION_GROUPS.reduce(
    (sum, group) => {
      const c = counts(group);
      return { selected: sum.selected + c.selected, total: sum.total + c.total };
    },
    { selected: 0, total: 0 },
  );

  /** Select-all turns every checkbox on and picks the first ("all") radio option. */
  function setGroups(groups: PermissionGroup[], on: boolean) {
    setChecks((prev) => {
      const next = new Set(prev);
      for (const group of groups)
        for (const block of group.blocks)
          if (block.kind === "check")
            for (const item of block.items) {
              if (on) next.add(item.key);
              else next.delete(item.key);
            }
      return next;
    });
    setRadios((prev) => {
      const next = { ...prev };
      for (const group of groups)
        for (const block of group.blocks)
          if (block.kind === "radio") next[block.id] = on ? block.items[0].key : undefined;
      return next;
    });
  }

  function toggleCheck(key: string) {
    setChecks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    const error = name ? undefined : "Role name is required";
    setNameError(error);
    setSaved(!error);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpTo(key: string) {
    document.getElementById(`perm-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {saved && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {editing ? "Changes look good" : "Looks good"} — {totals.selected} permissions
          selected. This is a demo screen, so nothing was sent to the server yet.
        </div>
      )}

      <Card
        title={
          <div>
            <h2 className="text-sm font-semibold">Role details</h2>
            <p className="mt-0.5 text-xs text-muted">Give the role a name people will recognise.</p>
          </div>
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="max-w-md">
          <Input
            name="name"
            label="Role name *"
            placeholder="e.g. Shift Supervisor"
            defaultValue={role?.name}
            error={nameError}
          />
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[220px_1fr]">
        {/* group index — sticky, so any group is one click away */}
        <nav
          aria-label="Permission groups"
          className="scrollbar-none sticky top-5 hidden max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-xl border border-line bg-background p-2 lg:block"
        >
          {PERMISSION_GROUPS.map((group) => {
            const c = counts(group);
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => jumpTo(group.key)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <span className="truncate">{group.label}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 text-[10.5px] tabular-nums",
                    c.selected > 0 ? "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200" : "text-muted",
                  )}
                >
                  {c.selected}/{c.total}
                </span>
              </button>
            );
          })}
        </nav>

        <Card
          title={
            <div>
              <h2 className="text-sm font-semibold">Permissions</h2>
              <p className="mt-0.5 text-xs text-muted">
                {totals.selected} of {totals.total} selected
              </p>
            </div>
          }
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGroups(PERMISSION_GROUPS, true)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900"
              >
                Select everything
              </button>
              <button
                type="button"
                onClick={() => setGroups(PERMISSION_GROUPS, false)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          }
          bodyClassName="px-0 pb-0"
        >
          <div className="border-t border-line px-5 py-3">
            <label className="relative block max-w-sm">
              <span className="sr-only">Search permissions</span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search permissions..."
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:bg-background"
              />
            </label>
          </div>

          {visibleGroups.map((group) => {
            // counts and select-all always use the full group, not the filtered one
            const full = PERMISSION_GROUPS.find((g) => g.key === group.key)!;
            const c = counts(full);
            const all = c.selected === c.total;

            return (
              <section
                key={group.key}
                id={`perm-${group.key}`}
                className="grid scroll-mt-5 gap-4 border-t border-line px-5 py-4 md:grid-cols-[220px_1fr]"
              >
                <div>
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                    {group.label}
                    <span className="rounded bg-surface px-1.5 text-[10.5px] font-normal tabular-nums text-muted">
                      {c.selected}/{c.total}
                    </span>
                  </h3>
                  {group.hint && <p className="mt-1 text-xs text-muted">{group.hint}</p>}
                  {group.selectAll && (
                    <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={all}
                        // some but not all -> show the dash state
                        ref={(el) => {
                          if (el) el.indeterminate = c.selected > 0 && !all;
                        }}
                        onChange={() => setGroups([full], !all)}
                        className="h-3.5 w-3.5 accent-brand-500"
                      />
                      Select all
                    </label>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {group.blocks.map((block) =>
                    block.kind === "radio" ? (
                      <fieldset
                        key={block.id}
                        className="rounded-lg border border-line bg-surface/50 p-1.5"
                      >
                        <legend className="sr-only">{group.label} scope</legend>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {block.items.map((item) => {
                            const chosen = radios[block.id] === item.key;
                            return (
                              <label
                                key={item.key}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                                  chosen
                                    ? "bg-background font-medium text-foreground shadow-sm"
                                    : "text-muted hover:text-foreground",
                                )}
                              >
                                <input
                                  type="radio"
                                  name={block.id}
                                  checked={chosen}
                                  onChange={() =>
                                    setRadios((prev) => ({ ...prev, [block.id]: item.key }))
                                  }
                                  className="h-3.5 w-3.5 accent-brand-500"
                                />
                                {item.label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ) : (
                      <div key={`${group.key}-check`} className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
                        {block.items.map((item) => (
                          <label
                            key={item.key}
                            className="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-surface"
                          >
                            <input
                              type="checkbox"
                              checked={checks.has(item.key)}
                              onChange={() => toggleCheck(item.key)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-500"
                            />
                            <span className={checks.has(item.key) ? "text-foreground" : "text-muted"}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              </section>
            );
          })}

          {visibleGroups.length === 0 && (
            <p className="border-t border-line px-5 py-12 text-center text-[13px] text-muted">
              No permissions match &ldquo;{search}&rdquo;.
            </p>
          )}
        </Card>
      </div>

      {/* action bar stays pinned at the bottom of the long form */}
      <div className="sticky bottom-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-background/90 px-4 py-3 shadow-lg shadow-navy-950/[0.06] backdrop-blur">
        <span className="text-[13px] text-muted">
          <span className="font-medium text-foreground tabular-nums">{totals.selected}</span> of{" "}
          {totals.total} permissions selected
        </span>
        <div className="flex items-center gap-2">
          <Link href="/roles" className={buttonStyles({ variant: "secondary" })}>
            Cancel
          </Link>
          <Button type="submit" variant="brand">
            {editing ? "Update role" : "Save role"}
          </Button>
        </div>
      </div>
    </form>
  );
}
