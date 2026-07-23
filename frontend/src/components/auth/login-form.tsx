"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/hooks/use-auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  // backend 422 par field-wise errors bhejta hai -> unhe inputs par map karo
  const fieldErrors =
    login.error instanceof ApiError ? login.error.fieldErrors() : {};
  // 401 jaisi errors kisi field se nahi judi — unhe upar dikhate hain
  const showFormError =
    login.error instanceof ApiError && Object.keys(fieldErrors).length === 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {showFormError && <ErrorState error={login.error} />}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        error={fieldErrors["body.email"]}
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        error={fieldErrors["body.password"]}
      />

      <Button type="submit" loading={login.isPending} className="mt-2">
        Sign in
      </Button>
    </form>
  );
}
