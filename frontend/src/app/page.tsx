import { Hero } from "@/components/marketing/hero";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Public landing page — full bleed: header poori chaurai mein, hero neeche ki
 * saari height le leta hai.
 *
 * App khud `/products` par hai (wahan `AuthGuard` lagi hai) — ye sirf marketing
 * shell hai, is liye yahan koi auth check nahi.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <SiteHeader />
      <Hero />
    </div>
  );
}
