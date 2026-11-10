import type { Metadata } from "next";

import { CommunicatorScreen } from "@/components/platform/communicator-screen";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Communicator",
};

/** Platform admin -> Communicator. */
export default function CommunicatorPage() {
  return (
    <PlatformPage section="Communicator" title="Communicator" description="Email or notify businesses: everyone, a plan, a hand-picked list, or by status.">
      <CommunicatorScreen />
    </PlatformPage>
  );
}
