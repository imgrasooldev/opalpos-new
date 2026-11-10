import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterBusinessForm } from "@/components/auth/register-business-form";

export const metadata: Metadata = {
  title: "Register your business",
};

/** Register Business: a shop signs itself up and starts a free trial. */
export default function RegisterPage() {
  return (
    <AuthLayout title="Start selling with Opal POS" description="Pick a plan, try it free, and only pay for the features you use">
      <RegisterBusinessForm />
    </AuthLayout>
  );
}
