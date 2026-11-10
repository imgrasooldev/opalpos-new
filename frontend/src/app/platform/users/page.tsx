import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform/platform-page";
import { PlatformUsersScreen } from "@/components/platform/platform-users-screen";

export const metadata: Metadata = {
  title: "Platform users",
};

/** Platform admin -> Platform users. */
export default function PlatformUsersPage() {
  return (
    <PlatformPage section="Platform users" title="Platform users" description="The platform team: who can sign in here and what they can do.">
      <PlatformUsersScreen />
    </PlatformPage>
  );
}
