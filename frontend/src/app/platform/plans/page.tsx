import type { Metadata } from "next";
import Link from "next/link";

import { PlatformPage } from "@/components/platform/platform-page";
import { PlansScreen } from "@/components/platform/plans-screen";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Plans",
};

/** Platform admin -> All plans. */
export default function PlansPage() {
  return (
    <PlatformPage
      section="Plans"
      title="Plans"
      description="Ready bundles of features with usage limits, for shops that don't want to pick features one by one."
      actions={
        <Link href="/platform/plans/create" className={buttonStyles({ variant: "brand" })}>
          <Icon name="plus" className="h-4 w-4" />
          Add plan
        </Link>
      }
    >
      <PlansScreen />
    </PlatformPage>
  );
}
