"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";

/**
 * Forgot password screen — abhi poori tarah static hai.
 *
 * Backend par reset endpoint mojood nahi (`app/api/v1/endpoints/auth.py` mein
 * sirf register/login/refresh/me hain), is liye submit par koi request nahi
 * jati: form seedha "email bhej diya" wali surat dikha deta hai.
 *
 * Jab endpoint ban jaye to sirf `handleSubmit` badalna hoga — ek mutation
 * (`useForgotPassword`) call karo aur uske `isPending`/`error` ko neeche
 * pehle se mojood `loading`/error slots par laga do. Baaki markup wahi rahega.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="rounded-2xl border border-line bg-background p-6 shadow-lg shadow-navy-950/5 sm:p-8 dark:bg-surface">
      <div className="flex flex-col items-center text-center">
        <Logo size="md" className="mb-4" />

        {sent ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              We sent a reset link to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold tracking-tight">
              Forgot password?
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Enter the email you use for {BRAND.name}
            </p>
          </>
        )}
      </div>

      {sent ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="rounded-lg bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted dark:bg-navy-900">
            The link works for 15 minutes. Nothing in your inbox? Check the spam
            folder, or try another address below.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setSent(false)}
            className="w-full"
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            trailing={<Icon name="mail" className="mr-1 h-4 w-4" />}
          />

          <Button type="submit" variant="brand" size="lg" className="mt-2 w-full">
            Send reset link
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
        Back to sign in
      </Link>
    </div>
  );
}
