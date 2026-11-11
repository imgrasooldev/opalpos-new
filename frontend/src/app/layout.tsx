import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { DemoGuide } from "@/components/demo/demo-guide";
import { BRAND } from "@/lib/brand";

/**
 * UI font — design ka geometric sans. Geist (neutral grotesque) headings par
 * kaafi mukhtalif lag raha tha.
 *
 * Badalna ho to sirf ye import + `sans` ki definition chhedni hai, baaki poori
 * app `--font-sans` token se chalti hai. Qareeb ke options: Manrope, Poppins.
 */
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-family",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} | ${BRAND.tagline}`,
    // page apna chhota title de, brand yahan se lag jayega
    template: `%s · ${BRAND.name}`,
  },
  description: "Sales, inventory and insights, all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      {/* browser extensions (e.g. ColorZilla's `cz-shortcut-listen`) add attributes
          to body before React loads — ignore mismatches on this one tag only */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
        {/* static demo build: a guide to the whole flow, with demo sign-ins */}
        <DemoGuide />
      </body>
    </html>
  );
}
