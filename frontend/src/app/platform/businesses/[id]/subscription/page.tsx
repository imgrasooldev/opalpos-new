import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform/platform-page";
import { SubscriptionManager } from "@/components/platform/subscription-editor";

export const metadata: Metadata = {
  title: "Manage subscription",
};

/** Platform admin -> Businesses -> Manage subscription. */
export default async function ManageSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformPage section="Manage subscription" title="Manage subscription" description="A plan or single features, extras, billing cycle and renewal for one business.">
      <SubscriptionManager key={id} id={Number(id)} />
    </PlatformPage>
  );
}
