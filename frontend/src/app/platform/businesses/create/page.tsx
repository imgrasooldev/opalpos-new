import type { Metadata } from "next";

import { BusinessForm } from "@/components/platform/business-form";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Add business",
};

/** Platform admin -> Add business. */
export default function AddBusinessPage() {
  return (
    <PlatformPage section="Add business" title="Add business" description="Creates the business, its owner login, its first location and its subscription in one step.">
      <BusinessForm />
    </PlatformPage>
  );
}
