import Image from "next/image";
import Link from "next/link";

import posTerminal from "@/assets/pos-terminal.png";
import { HighlightList, type Highlight } from "@/components/marketing/highlight-list";
import { buttonStyles } from "@/components/ui/button";

const HIGHLIGHTS: Highlight[] = [
  { icon: "tag", title: "Sell anywhere", description: "Online or in-store" },
  { icon: "cube", title: "Manage inventory", description: "In real time" },
  { icon: "chart", title: "Gain insights", description: "Grow with confidence" },
];

export function Hero() {
  return (
    // flex-1 -> header ke neeche bachi hui poori height
    <section className="relative isolate flex flex-1 items-center overflow-hidden bg-navy-900 px-6 py-14 sm:px-10 sm:py-16">
      {/* background: neeche bayen dotted wave + upar dayen brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-[34rem] bg-dot-grid text-aqua-400/40 [mask-image:radial-gradient(ellipse_at_22%_82%,black,transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[32rem] w-[32rem] rounded-full bg-brand-500/25 blur-3xl"
      />

      {/* content center-aligned rehta hai, background full bleed */}
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col">
          <span className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/75">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-aqua-300" />
            Built for retail and wholesale teams
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-[58px]">
            Run your
            <br />
            business{" "}
            {/* gradient sirf aakhri lafz par — poori heading par rakhne se
                padhne mein bhaari lagti hai */}
            <span className="bg-[linear-gradient(100deg,var(--color-aqua-300),var(--color-brand-300)_50%,var(--color-plum-400))] bg-clip-text text-transparent">
              Simply
            </span>
          </h1>

          <p className="mt-6 max-w-md text-[17px] leading-7 text-white/65">
            Sales, inventory and insights — all in one place
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/login"
              className={buttonStyles({ variant: "brand", size: "lg" })}
            >
              Get started
            </Link>
            <Link
              href="/login"
              className={buttonStyles({ variant: "inverse", size: "lg" })}
            >
              Sign in
            </Link>
          </div>

          <HighlightList id="features" items={HIGHLIGHTS} className="mt-14" />
        </div>

        <div id="solutions" className="relative">
          <Image
            src={posTerminal}
            alt="Opal Pay terminal, card reader and card"
            // LCP image — priority, aur do breakpoints ke hisab se sizes
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            // column se thora barha hua — dayen kinare par halka sa crop, jaise
            // reference mein hai (section `overflow-hidden` hai)
            className="h-auto w-full lg:w-[112%] lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
