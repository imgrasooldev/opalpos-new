"use client";

/**
 * Floating "Demo guide" on every page: how to walk through the whole Opal
 * POS SaaS without a backend, the demo sign-ins, quick links to each part,
 * and a reset that throws every demo change away.
 *
 * Everything the demo saves lives in this browser (localStorage), so it is
 * shared by all tabs: open the platform admin in one tab and the shop in
 * another, and changes show up in both.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { resetDemoData } from "@/components/inventory/demo-store";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const STEPS: { title: string; text: string; href: string }[] = [
  { title: "Website", text: "The landing page; Get started opens sign-up.", href: "/" },
  { title: "Register a shop", text: "Business, owner login, plan. It starts a free trial and opens the shop's console.", href: "/register" },
  { title: "Use the shop", text: "Only the paid features show. Settings -> Subscription to pay, add features or change plan.", href: "/dashboard" },
  { title: "Platform admin", text: "Sign in as the Opal team. The new shop is on the businesses list.", href: "/platform/login" },
  { title: "Run the business", text: "Manage subscriptions, run renewals, record payments, suspend, send messages.", href: "/platform/businesses" },
  { title: "Back to the shop", text: "Log in as business, or sign in on the shop login with a demo shop.", href: "/login" },
];

const LINKS: { label: string; href: string }[] = [
  { label: "Website", href: "/" },
  { label: "Register", href: "/register" },
  { label: "Shop sign-in", href: "/login" },
  { label: "Shop console", href: "/dashboard" },
  { label: "Platform sign-in", href: "/platform/login" },
  { label: "Platform console", href: "/platform" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Feature catalog", href: "/platform/features" },
];

export function DemoGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open && (
        <div className="mb-2 max-h-[80vh] w-[340px] overflow-y-auto rounded-2xl border border-line bg-background p-4 text-[13px] shadow-2xl shadow-navy-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Icon name="info" className="h-4 w-4 text-brand-500" />
                Demo guide
              </p>
              <p className="mt-0.5 text-xs text-muted">No backend: everything is saved in this browser and shared by all its tabs.</p>
            </div>
            <button type="button" aria-label="Close demo guide" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>

          <ol className="mt-3 flex flex-col gap-1">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Link
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className={cn("flex gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface", pathname === s.href && "bg-surface")}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-semibold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{s.title}</span>
                    <span className="block text-xs text-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-3 rounded-lg bg-surface px-3 py-2.5 text-xs">
            <p className="font-medium">Demo sign-ins</p>
            <p className="mt-1 text-muted">
              Shop: username <span className="font-mono text-foreground">glassgalaxy</span>, password <span className="font-mono text-foreground">demo1234</span> (the shop login lists more)
            </p>
            <p className="mt-1 text-muted">
              Platform: <span className="font-mono text-foreground">adnan@opalpay.example</span>, password <span className="font-mono text-foreground">demo1234</span>, any 6-digit code
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn("rounded-full border px-2.5 py-1 text-xs hover:bg-surface", pathname === l.href ? "border-brand-500 text-brand-600" : "border-line")}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="text-xs text-muted">{sure ? "Throw away every demo change?" : "Start the demo over"}</span>
            <button
              type="button"
              onClick={() => {
                if (!sure) return setSure(true);
                resetDemoData();
                window.location.href = "/";
              }}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", sure ? "bg-rose-600 text-white hover:bg-rose-700" : "border border-line hover:bg-surface")}
            >
              {sure ? "Yes, reset" : "Reset demo data"}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v);
            setSure(false);
          }}
          className="flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-navy-950/30 hover:bg-navy-800"
        >
          <Icon name={open ? "close" : "info"} className="h-3.5 w-3.5" />
          Demo guide
        </button>
      </div>
    </div>
  );
}
