import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { PlatformLoginForm } from "@/components/platform/platform-login-form";

export const metadata: Metadata = {
  title: "Platform admin sign in",
};

/** Platform admin -> Sign in (the Opal team's own login). */
export default function PlatformLoginPage() {
  return (
    <AuthLayout title="Opal POS platform" description="Businesses, plans and billing for every shop on Opal POS">
      <PlatformLoginForm />
    </AuthLayout>
  );
}
