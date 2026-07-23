"use client";

/**
 * Auth hooks — login/logout, current user, aur permission check.
 *
 * `useMe()` hi sach ka wahid source hai: token valid hai to backend user
 * wapas deta hai, warna 401 aata hai aur hum logged-out samajhte hain.
 */

import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import * as authService from "@/lib/services/auth";
import type { LoginInput, Me, RegisterInput, TokenResponse } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useMe(): UseQueryResult<Me> {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authService.me,
    // 401 par retry bekaar — user logged out hai
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin(): UseMutationResult<TokenResponse, Error, LoginInput> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async () => {
      // token badla -> saara cached data purana ho gaya
      await queryClient.invalidateQueries();
      router.push("/products");
    },
  });
}

export function useRegister(): UseMutationResult<
  TokenResponse,
  Error,
  RegisterInput
> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.push("/products");
    },
  });
}

export function useLogout(): () => void {
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    authService.logout();
    // doosre user ka data cache mein na reh jaye
    queryClient.clear();
    router.push("/login");
  };
}

/**
 * Permission check — backend ke `require_permission()` ka UI jorha.
 *
 * NOTE: ye sirf UI chhupane ke liye hai. Asli enforcement backend par hoti
 * hai; yahan check karne ka matlab security nahi, sirf behtar UX hai.
 */
export function usePermission(): {
  can: (permission: string) => boolean;
  isLoading: boolean;
  isAdmin: boolean;
} {
  const { data, isPending } = useMe();

  return {
    can: (permission: string) =>
      data?.role?.is_admin === true ||
      (data?.permissions ?? []).includes(permission),
    isLoading: isPending,
    isAdmin: data?.role?.is_admin === true,
  };
}

/** 401 ko pehchanne ke liye chhota helper. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
