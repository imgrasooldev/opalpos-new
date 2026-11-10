import type { Metadata } from "next";

import { FeaturesScreen } from "@/components/platform/features-screen";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Feature catalog",
};

/** Platform admin -> Feature catalog. */
export default function FeaturesPage() {
  return (
    <PlatformPage section="Feature catalog" title="Feature catalog" description="Everything Opal POS sells, with a price per feature, so a shop can buy only what it needs.">
      <FeaturesScreen />
    </PlatformPage>
  );
}
