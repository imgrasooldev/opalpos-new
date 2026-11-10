import type { Metadata } from "next";

import { PlanEdit } from "@/components/platform/plan-form";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Edit plan",
};

/** Platform admin -> Plans -> Edit. */
export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PlatformPage section="Edit plan" title="Edit plan" description="Changes reach businesses on this plan from their next invoice.">
      <PlanEdit key={id} id={Number(id)} />
    </PlatformPage>
  );
}
