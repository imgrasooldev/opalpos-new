/**
 * Auth API service + token storage.
 *
 * Token `localStorage` mein rakha jata hai aur `setAccessToken()` se api client
 * ko diya jata hai (wo har request par `Authorization: Bearer` lagata hai).
 *
 * NOTE: localStorage XSS ke against secure nahi hota. Production ke liye
 * httpOnly cookie behtar hai — us soorat mein backend ko cookie set karni hogi.
 * Demo/simple setup ke liye ye theek hai.
 */

import { api, setAccessToken } from "@/lib/api";
import type {
  LoginInput,
  Me,
  RegisterInput,
  TokenResponse,
} from "@/types/auth";

const ACCESS_KEY = "opalpos.access_token";
const REFRESH_KEY = "opalpos.refresh_token";

// --------------------------------------------------------------------------- //
// token storage
// --------------------------------------------------------------------------- //
export function storeTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  setAccessToken(tokens.access_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  setAccessToken(null);
}

/** Page reload ke baad token wapas api client ko dena. */
export function restoreToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ACCESS_KEY);
  setAccessToken(token);
  return token;
}

// --------------------------------------------------------------------------- //
// API calls
// --------------------------------------------------------------------------- //
export async function login(input: LoginInput): Promise<TokenResponse> {
  const tokens = await api.post<TokenResponse>("/auth/login", input);
  storeTokens(tokens);
  return tokens;
}

export async function register(input: RegisterInput): Promise<TokenResponse> {
  const tokens = await api.post<TokenResponse>("/auth/register", input);
  storeTokens(tokens);
  return tokens;
}

export function me(): Promise<Me> {
  return api.get<Me>("/auth/me");
}

export function logout(): void {
  clearTokens();
}
