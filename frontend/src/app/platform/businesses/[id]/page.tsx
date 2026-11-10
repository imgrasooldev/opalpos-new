import type { Metadata } from "next";

import { BusinessView } from "@/components/platform/business-view";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Business",
};

/** Platform admin -> Businesses -> View. */
export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformPage section="Business" title="Business" description="Plan, usage, subscriptions and payments for one business.">
      <BusinessView key={id} id={Number(id)} />
    </PlatformPage>
  );
}
