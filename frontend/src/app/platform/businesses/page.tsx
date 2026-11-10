import type { Metadata } from "next";

import { BusinessesScreen } from "@/components/platform/businesses-screen";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Businesses",
};

/** Platform admin -> All businesses; `?status=Past due` opens on that status. */
export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return (
    <PlatformPage section="Businesses" title="Businesses" description="Every shop on the platform with its plan, status and next billing date.">
      <BusinessesScreen key={status ?? "all"} initialState={status} />
    </PlatformPage>
  );
}
