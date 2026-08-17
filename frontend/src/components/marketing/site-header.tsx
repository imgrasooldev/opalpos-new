"use client";

import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SUPPORT_HREF } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** Anchors + mailto — abhi koi alag marketing route nahi hai. */
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Support", href: SUPPORT_HREF },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <Logo href="/" priority />

        {/* links par hover pill — plain text links ke muqable zyada sanjeeda */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonStyles({ variant: "secondary" })}>
            Sign in
          </Link>
          <Link href="/login" className={buttonStyles({ variant: "accent" })}>
            Get started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface md:hidden"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      {/* mobile panel — desktop par `md:hidden` ki wajah se render hi nahi hota */}
      <div
        id="site-nav"
        className={cn(
          "flex-col gap-1 border-t border-line bg-background px-6 py-3 md:hidden",
          open ? "flex" : "hidden",
        )}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface"
          >
            {link.label}
          </a>
        ))}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href="/login" className={buttonStyles({ variant: "secondary" })}>
            Sign in
          </Link>
          <Link href="/login" className={buttonStyles({ variant: "accent" })}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
