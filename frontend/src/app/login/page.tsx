import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { SUPPORT_HREF } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sales, stock and customers. Pick up where you left off"
    >
      <LoginForm />

      {/* card ke bahar — reference ki tarah, form se alag rakha hai */}
      <p className="mt-6 text-center text-sm text-muted">
        Trouble signing in?{" "}
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
