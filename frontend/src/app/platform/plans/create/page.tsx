import type { Metadata } from "next";

import { PlanForm } from "@/components/platform/plan-form";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Add plan",
};

/** Platform admin -> Add plan. */
export default function AddPlanPage() {
  return (
    <PlatformPage section="Add plan" title="Add plan" description="A bundle of features with its price, limits and free trial.">
      <PlanForm />
    </PlatformPage>
  );
}
