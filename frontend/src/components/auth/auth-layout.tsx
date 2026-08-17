/**
 * Auth screens ka do-hissa layout: bayen brand panel, dayen form card.
 *
 * Mobile par brand panel chhup jata hai (form pehle aana chahiye) — us soorat
 * mein logo card ke upar aa jata hai.
 */

import Image from "next/image";
import type { ReactNode } from "react";

import payIllustration from "@/assets/pay-illustration.png";
import { Logo } from "@/components/brand/logo";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthLayout({ title, description, children }: Props) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      {/* brand side */}
      <aside className="relative hidden overflow-hidden bg-navy-900 p-10 lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent,var(--color-brand-600)_55%,var(--color-plum-500))] opacity-45"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -left-8 h-64 w-64 bg-dot-grid text-aqua-300/25 [mask-image:radial-gradient(circle_at_30%_70%,black,transparent_70%)]"
        />

        <Logo href="/" tone="light" size="lg" priority className="relative" />

        <div className="relative mt-16 max-w-sm">
          <h2 className="text-3xl font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {description}
          </p>
        </div>

        <Image
          src={payIllustration}
          alt=""
          sizes="50vw"
          className="relative mt-auto h-auto w-full max-w-sm self-center"
        />
      </aside>

      {/* form side */}
      {/* dark mein card upar uthta hua lage: page gehra, card halka */}
      <main className="flex items-center justify-center bg-surface px-4 py-10 sm:px-6 dark:bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo href="/" size="md" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
