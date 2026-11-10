"use client";

/**
 * Platform admin -> Communicator: send an email and/or in-app notification
 * to businesses.
 *   - audience: all businesses, by package, hand-picked businesses, trials
 *     ending soon, past due, suspended or expired businesses
 *   - placeholders ({business_name}, {owner_name}, {plan}, {end_date}) are
 *     filled per business, with a preview for the first recipient
 *   - history of what was sent, with View and "Use again"
 */

import { useMemo, useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  AUDIENCES,
  CHANNELS,
  businessStatus,
  dayFrom,
  fmtDate,
  subscriptionLabel,
  updatePlatformMessages,
  useBusinesses,
  useInvoices,
  usePlans,
  usePlatformMessages,
  usePlatformSettings,
  useSubscriptions,
  type Audience,
  type Business,
  type Channel,
  type PlatformMessage,
} from "@/components/platform/platform-data";
import { Field, Select, inputClass } from "@/components/platform/platform-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const PLACEHOLDERS = ["{business_name}", "{owner_name}", "{plan}", "{end_date}"] as const;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function CommunicatorScreen() {
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const plans = usePlans();
  const invoices = useInvoices();
  const settings = usePlatformSettings();
  const subs = useSubscriptions();
  const messages = usePlatformMessages();

  const [audience, setAudience] = useState<Audience>("All businesses");
  const [targetIds, setTargetIds] = useState<number[]>([]);
  const [channel, setChannel] = useState<Channel>("Email and in-app");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PlatformMessage | null>(null);

  const info = useMemo(
    () =>
      new Map(
        businesses.map((b) => {
          const sub = subs.find((x) => x.businessId === b.id);
          return [b.id, { sub, status: businessStatus(b, sub, invoices, settings) }];
        }),
      ),
    [businesses, subs, invoices, settings],
  );
  const recipients = useMemo(() => {
    const stateIs = (b: Business, state: string) => info.get(b.id)?.status.state === state;
    switch (audience) {
      case "By plan":
        return businesses.filter((b) => targetIds.includes(info.get(b.id)?.sub?.planId ?? -1));
      case "Selected businesses":
        return businesses.filter((b) => targetIds.includes(b.id));
      case "Trials ending":
        // trials that end within a week
        return businesses.filter((b) => stateIs(b, "Trial") && (info.get(b.id)?.sub?.trialEndDate ?? "") <= dayFrom(7));
      case "Past due":
      case "Suspended":
      case "Expired":
        return businesses.filter((b) => stateIs(b, audience));
      default:
        return businesses;
    }
  }, [audience, targetIds, businesses, info]);

  const fill = (text: string, b: Business | undefined) => {
    if (!b) return text;
    const i = info.get(b.id);
    return text
      .replaceAll("{business_name}", b.name)
      .replaceAll("{owner_name}", b.ownerName)
      .replaceAll("{plan}", subscriptionLabel(i?.sub, plans))
      .replaceAll("{end_date}", i?.status.nextBilling ? fmtDate(i.status.nextBilling) : i?.sub ? fmtDate(i.sub.periodEnd) : "—");
  };

  function pickAudience(a: Audience) {
    setAudience(a);
    setTargetIds([]);
  }

  function check() {
    const next: Record<string, string> = {};
    if (!subject.trim()) next.subject = "Subject is required";
    if (!body.trim()) next.body = "Write the message";
    if ((audience === "By plan" || audience === "Selected businesses") && targetIds.length === 0)
      next.targets = audience === "By plan" ? "Pick at least one plan" : "Pick at least one business";
    else if (recipients.length === 0) next.targets = "Nobody matches this audience right now";
    setErrors(next);
    if (Object.keys(next).length === 0) setConfirming(true);
  }

  function send() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    updatePlatformMessages((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((m) => m.id)) + 1,
        subject: subject.trim(),
        body: body.trim(),
        audience,
        targetIds,
        channel,
        recipients: recipients.length,
        sentAt: now.toISOString().slice(0, 16),
        sentBy: "Adnan Ahmed",
      },
    ]);
    setSent(`Sent to ${recipients.length} business${recipients.length === 1 ? "" : "es"}.`);
    setSubject("");
    setBody("");
    setTargetIds([]);
    setConfirming(false);
  }

  function reuse(m: PlatformMessage) {
    setAudience(m.audience);
    setTargetIds(m.targetIds);
    setChannel(m.channel);
    setSubject(m.subject);
    setBody(m.body);
    setSent(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const columns: DataColumn<PlatformMessage>[] = [
    { key: "sentAt", label: "Sent", sortValue: (m) => m.sentAt, text: (m) => when(m.sentAt), render: (m) => <span className="whitespace-nowrap">{when(m.sentAt)}</span> },
    {
      key: "subject",
      label: "Subject",
      sortValue: (m) => m.subject,
      text: (m) => m.subject,
      render: (m) => (
        <button type="button" onClick={() => setViewing(m)} className="max-w-80 truncate text-left font-medium hover:text-brand-500 hover:underline">
          {m.subject}
        </button>
      ),
    },
    {
      key: "audience",
      label: "Audience",
      sortValue: (m) => m.audience,
      text: (m) => m.audience,
      render: (m) => (
        <span className="leading-tight">
          <span className="block">{m.audience}</span>
          {m.audience === "By plan" && (
            <span className="block text-xs text-muted">{m.targetIds.map((id) => plans.find((p) => p.id === id)?.name ?? "Deleted").join(", ")}</span>
          )}
        </span>
      ),
    },
    { key: "channel", label: "Channel", sortValue: (m) => m.channel, text: (m) => m.channel, render: (m) => <Badge tone="blue">{m.channel}</Badge> },
    { key: "recipients", label: "Recipients", sortValue: (m) => m.recipients, text: (m) => String(m.recipients), render: (m) => <span className="tabular-nums">{m.recipients}</span>, align: "right" },
    { key: "sentBy", label: "Sent by", sortValue: (m) => m.sentBy, text: (m) => m.sentBy },
  ];

  const first = recipients[0];
  const shown = businesses.filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card
          title={
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="send" className="h-4 w-4 text-brand-500" />
              New message
            </h2>
          }
          bodyClassName="border-t border-line pt-4"
        >
          {sent && (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Icon name="check" className="h-4 w-4" />
              {sent}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Send to *">
              <Select label="Send to" value={audience} onChange={(v) => pickAudience(v as Audience)}>
                {AUDIENCES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </Field>
            <Field label="Channel *">
              <Select label="Channel" value={channel} onChange={(v) => setChannel(v as Channel)}>
                {CHANNELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>

          {audience === "By plan" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {plans.map((p) => {
                const on = targetIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTargetIds((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
                    className={cn("rounded-full border px-3 py-1.5 text-[13px] transition-colors", on ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200" : "border-line hover:bg-surface")}
                  >
                    {on && <Icon name="check" className="mr-1 inline h-3.5 w-3.5" />}
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}

          {audience === "Selected businesses" && (
            <div className="mt-4 rounded-lg border border-line">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Icon name="search" className="h-4 w-4 text-muted" />
                <input aria-label="Search businesses" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search businesses" className="flex-1 bg-transparent text-[13px] outline-none" />
                <span className="text-xs text-muted">{targetIds.length} picked</span>
              </div>
              <ul className="scrollbar-none max-h-48 overflow-y-auto p-1.5">
                {shown.map((b) => (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-surface">
                      <input
                        type="checkbox"
                        checked={targetIds.includes(b.id)}
                        onChange={(event) => setTargetIds((prev) => (event.target.checked ? [...prev, b.id] : prev.filter((x) => x !== b.id)))}
                        className="h-4 w-4 accent-brand-500"
                      />
                      {b.name}
                      <span className="text-xs text-muted">{b.ownerEmail}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errors.targets && <p className="mt-2 text-xs text-red-600">{errors.targets}</p>}

          <div className="mt-4 flex flex-col gap-4">
            <Field label="Subject *" error={errors.subject}>
              <input aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={cn(inputClass, errors.subject && "border-red-500")} />
            </Field>
            <Field label="Message *" error={errors.body}>
              <textarea aria-label="Message" rows={7} value={body} onChange={(event) => setBody(event.target.value)} className={cn(inputClass, errors.body && "border-red-500")} />
            </Field>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted">Insert:</span>
              {PLACEHOLDERS.map((p) => (
                <button key={p} type="button" onClick={() => setBody((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${p}`)} className="rounded-md border border-line px-2 py-1 font-mono hover:bg-surface">
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
            <span className="mr-auto text-[13px] text-muted">
              {hydrated ? (
                <>
                  <b className="text-foreground">{recipients.length}</b> business{recipients.length === 1 ? "" : "es"} will get it
                </>
              ) : (
                "…"
              )}
            </span>
            <Button type="button" variant="brand" onClick={check}>
              <Icon name="send" className="h-4 w-4" />
              Send
            </Button>
          </div>
        </Card>

        <Card title="Preview" action={<span className="text-xs text-muted">{first ? `As ${first.name} sees it` : "No recipients yet"}</span>} bodyClassName="border-t border-line pt-4">
          <div className="rounded-lg border border-line bg-surface p-4 text-[13px]">
            <p className="text-xs text-muted">To: {first ? `${first.ownerName} <${first.ownerEmail}>` : "—"}</p>
            <p className="mt-2 font-semibold">{fill(subject, first) || "Subject"}</p>
            <p className="mt-2 whitespace-pre-line text-muted">{fill(body, first) || "Your message shows here, with the placeholders filled in."}</p>
          </div>
          {recipients.length > 1 && (
            <p className="mt-3 text-xs text-muted">
              Also: {recipients
                .slice(1, 6)
                .map((b) => b.name)
                .join(", ")}
              {recipients.length > 6 ? ` and ${recipients.length - 6} more` : ""}
            </p>
          )}
        </Card>
      </div>

      {hydrated && (
        <DataTable
          title="Sent messages"
          subtitle={`${messages.length} messages`}
          rows={messages}
          columns={columns}
          rowKey={(m) => m.id}
          defaultSort={{ key: "sentAt", direction: "desc" }}
          defaultPageSize={25}
          noun="messages"
          exportName="platform-messages"
          minWidth={900}
          actions={(m) => (
            <span className="inline-flex gap-1.5">
              <button type="button" onClick={() => setViewing(m)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface">
                View
              </button>
              <button type="button" onClick={() => reuse(m)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface">
                Use again
              </button>
            </span>
          )}
        />
      )}

      {confirming && (
        <ConfirmDialog
          tone="warning"
          title="Send this message?"
          confirmLabel="Send"
          message={`"${subject.trim()}" goes to ${recipients.length} business${recipients.length === 1 ? "" : "es"} by ${channel.toLowerCase()}. It can't be unsent.`}
          onCancel={() => setConfirming(false)}
          onConfirm={send}
        />
      )}

      {viewing && (
        <Modal title={viewing.subject} description={`${when(viewing.sentAt)} · ${viewing.audience} · ${viewing.recipients} recipients · ${viewing.channel}`} onClose={() => setViewing(null)} className="max-w-lg">
          <p className="whitespace-pre-line text-[13px]">{viewing.body}</p>
          <p className="mt-4 text-xs text-muted">Sent by {viewing.sentBy}</p>
        </Modal>
      )}
    </div>
  );
}
