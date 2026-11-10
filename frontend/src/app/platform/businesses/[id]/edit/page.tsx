import type { Metadata } from "next";

import { BusinessEdit } from "@/components/platform/business-form";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Edit business",
};

/** Platform admin -> Businesses -> Edit. */
export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformPage section="Edit business" title="Edit business" description="Business, owner and location details. The subscription has its own page.">
      <BusinessEdit key={id} id={Number(id)} />
    </PlatformPage>
  );
}
