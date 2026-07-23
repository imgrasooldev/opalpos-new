"use client";

/**
 * App-wide client providers.
 *
 * Do kaam:
 *  1. react-query client — `useState` mein banta hai, module scope mein nahi,
 *     warna server par sab requests ek hi cache share kar letin.
 *  2. Page load par localStorage se token wapas api client ko dena, warna
 *     refresh karte hi user logged out lagta.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api";
import { restoreToken } from "@/lib/services/auth";

export function Providers({ children }: { children: ReactNode }) {
  // useState ke initializer mein — pehle render se PEHLE chal jata hai, is liye
  // pehli query bhi token ke saath jati hai.
  useState(() => restoreToken());

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // 4xx par retry bekaar hai — sirf network/5xx par dobara koshish
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
