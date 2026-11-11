"use client";

/**
 * Shop sign-in.
 *
 * Demo shops (the businesses in the platform admin, including ones that
 * signed up on /register) sign in without the backend: their owner's email
 * or username, and any password of 8+ characters. Anyone else goes to the
 * real login API.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/brand/logo";
import { signInAsBusiness } from "@/components/platform/business-access";
import { useBusinesses, usePlatformSettings } from "@/components/platform/platform-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/hooks/use-auth";

/** Password the demo guide suggests (any 8+ characters work). */
export const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const router = useRouter();
  const businesses = useBusinesses();
  const settings = usePlatformSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [demoError, setDemoError] = useState("");
  const login = useLogin();

  // backend 422 par field-wise errors bhejta hai -> unhe inputs par map karo
  const fieldErrors = login.error instanceof ApiError ? login.error.fieldErrors() : {};
  // 401 jaisi errors kisi field se nahi judi — unhe upar dikhate hain
  const showFormError = login.error instanceof ApiError && Object.keys(fieldErrors).length === 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const who = email.trim().toLowerCase();
    const shop = businesses.find((b) => b.ownerEmail.toLowerCase() === who || b.username.toLowerCase() === who);
    if (shop) {
      if (password.length < 8) return setDemoError("Wrong email or password.");
      setDemoError("");
      signInAsBusiness(shop.id);
      router.push("/dashboard");
      return;
    }
    setDemoError("");
    login.mutate({ email, password, remember });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-background p-6 shadow-lg shadow-navy-950/5 sm:p-8 dark:bg-surface">
        <div className="flex flex-col items-center text-center">
          <Logo size="md" className="mb-4" />
          {/* logo upar hi brand ka naam keh raha hai — title mein dobara nahi */}
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted">Enter your email or username and password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {showFormError && <ErrorState error={login.error} />}
          {demoError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-200">{demoError}</p>}

          <Input
            label="Email or username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setDemoError("");
            }}
            placeholder="you@example.com"
            autoComplete="username"
            required
            error={fieldErrors["body.email"]}
            trailing={<Icon name="mail" className="mr-1 h-4 w-4" />}
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setDemoError("");
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            error={fieldErrors["body.password"]}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-zinc-200"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
              </button>
            }
          />

          <div className="flex items-center justify-between gap-3">
            <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <Link href="/forgot-password" className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-300">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="brand" size="lg" loading={login.isPending} className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        {settings.allowSignup && (
          <p className="mt-6 text-center text-[13px] text-muted">
            New to {settings.appName}?{" "}
            <Link href="/register" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-300">
              Register your business
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
