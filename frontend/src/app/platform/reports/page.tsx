import type { Metadata } from "next";

import { PlatformPage } from "@/components/platform/platform-page";
import { PlatformReports } from "@/components/platform/platform-reports";

export const metadata: Metadata = {
  title: "Platform reports",
};

/** Platform admin -> Reports. */
export default function PlatformReportsPage() {
  return (
    <PlatformPage section="Reports" title="Platform reports" description="Revenue per month, renewals, new and lost businesses, and top-selling features.">
      <PlatformReports />
    </PlatformPage>
  );
}
