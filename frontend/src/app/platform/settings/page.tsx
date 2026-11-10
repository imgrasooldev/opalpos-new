import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform/platform-page";
import { PlatformSettingsScreen } from "@/components/platform/platform-settings-screen";

export const metadata: Metadata = {
  title: "Platform settings",
};

/** Platform admin -> Settings. */
export default function PlatformSettingsPage() {
  return (
    <PlatformPage section="Settings" title="Platform settings" description="Sign-up, payment gateways, email and invoices for the whole platform.">
      <PlatformSettingsScreen />
    </PlatformPage>
  );
}
