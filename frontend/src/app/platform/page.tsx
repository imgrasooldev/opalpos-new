import type { Metadata } from "next";
import Link from "next/link";

import { PlatformDashboard } from "@/components/platform/platform-dashboard";
import { PlatformPage } from "@/components/platform/platform-page";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Platform admin",
};

/** Platform admin -> Dashboard. */
export default function PlatformHomePage() {
  return (
    <PlatformPage
      section="Platform dashboard"
      title="Platform dashboard"
      description="Businesses, plans and revenue across the whole Opal POS platform."
      actions={
        <Link href="/platform/businesses/create" className={buttonStyles({ variant: "brand" })}>
          <Icon name="plus" className="h-4 w-4" />
          Add business
        </Link>
      }
    >
      <PlatformDashboard />
    </PlatformPage>
  );
}
