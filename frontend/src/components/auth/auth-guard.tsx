"use client";

/**
 * Protected routes ka wrapper.
 *
 * Token na ho ya 401 aaye to `/login` par bhej deta hai. Backend par bhi guard
 * lagi hui hai — ye sirf UI ke liye hai, security ke liye nahi.
 */

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui/feedback";
import { isUnauthorized, useMe } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isPending, error } = useMe();

  useEffect(() => {
    if (!isPending && (isUnauthorized(error) || (!data && error))) {
      router.replace("/login");
    }
  }, [data, error, isPending, router]);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Checking session..." />
      </div>
    );
  }

  // redirect chalne tak kuch render na karo
  if (!data) return null;

  return <>{children}</>;
}
