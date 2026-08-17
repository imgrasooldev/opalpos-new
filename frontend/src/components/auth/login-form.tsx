"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/hooks/use-auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  // backend 422 par field-wise errors bhejta hai -> unhe inputs par map karo
  const fieldErrors =
    login.error instanceof ApiError ? login.error.fieldErrors() : {};
  // 401 jaisi errors kisi field se nahi judi — unhe upar dikhate hain
  const showFormError =
    login.error instanceof ApiError && Object.keys(fieldErrors).length === 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password, remember });
  }

  return (
    <div className="rounded-2xl border border-line bg-background p-6 shadow-lg shadow-navy-950/5 sm:p-8 dark:bg-surface">
      <div className="flex flex-col items-center text-center">
        <Logo size="md" className="mb-4" />
        {/* logo upar hi brand ka naam keh raha hai — title mein dobara nahi */}
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted">
          Enter your email and password to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {showFormError && <ErrorState error={login.error} />}

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={fieldErrors["body.email"]}
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
          <Checkbox
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="brand"
          size="lg"
          loading={login.isPending}
          className="mt-2 w-full"
        >
          Sign in
        </Button>
      </form>
    </div>
  );
}
