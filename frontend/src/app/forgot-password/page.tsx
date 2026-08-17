import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SUPPORT_HREF } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Happens to everyone — one email and you're back in"
    >
      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted">
        Need help?{" "}
        <a
          href={SUPPORT_HREF}
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-300"
        >
          Contact support
        </a>
      </p>
    </AuthLayout>
  );
}
