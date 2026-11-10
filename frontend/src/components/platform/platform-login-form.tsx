"use client";

/**
 * Platform admin sign-in: the Opal team's own login, above all businesses.
 * Email and password, then the 6-digit code from an authenticator app
 * (two-step login is on for platform admins).
 *
 * STATIC FOR NOW: any active platform team email with a password of 8+
 * characters and any 6 digits signs in and opens the platform dashboard.
 * The real check moves to the auth API.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/brand/logo";
import { usePlatformUsers } from "@/components/platform/platform-data";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

export function PlatformLoginForm() {
  const router = useRouter();
  const team = usePlatformUsers();
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    const user = team.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password.length < 8) return setError("Wrong email or password.");
    if (!user.active) return setError("This platform account is switched off. Ask a Super admin.");
    setError("");
    setStep("code");
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your authenticator app.");
    router.push("/platform");
  }

  return (
    <div className="rounded-2xl border border-line bg-background p-6 shadow-lg shadow-navy-950/5 sm:p-8 dark:bg-surface">
      <div className="flex flex-col items-center text-center">
        <Logo size="md" className="mb-4" />
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-plum-500/10 px-2.5 py-1 text-xs font-medium text-plum-600 dark:text-plum-400">
          <Icon name="shield" className="h-3.5 w-3.5" />
          Platform admin
        </span>
        <h1 className="text-lg font-semibold tracking-tight">{step === "password" ? "Sign in" : "Two-step login"}</h1>
        <p className="mt-1 text-[13px] text-muted">
          {step === "password" ? "For the Opal team only. Shops sign in on the normal login." : `Enter the code from your authenticator app for ${email.trim()}`}
        </p>
      </div>

      {step === "password" ? (
        <form onSubmit={submitPassword} className="mt-6 flex flex-col gap-4">
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@opalpay.example"
            autoComplete="username"
            required
            trailing={<Icon name="mail" className="mr-1 h-4 w-4" />}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
              </button>
            }
          />
          <Button type="submit" variant="brand" size="lg" className="mt-2 w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-6 flex flex-col gap-4">
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
          <Input
            label="6-digit code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="text-center font-mono text-lg tracking-[0.5em]"
            required
          />
          <Button type="submit" variant="brand" size="lg" className="mt-2 w-full">
            Sign in
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("password");
              setCode("");
              setError("");
            }}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Use another account
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        Running a shop?{" "}
        <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600">
          Shop sign-in
        </Link>
      </p>
    </div>
  );
}
