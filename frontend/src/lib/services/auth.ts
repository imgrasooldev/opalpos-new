/**
 * Auth API service + token storage.
 *
 * Token browser storage mein rakha jata hai aur `setAccessToken()` se api client
 * ko diya jata hai (wo har request par `Authorization: Bearer` lagata hai).
 *
 * "Remember me" tick ho to `localStorage` (tab band karne ke baad bhi rahega),
 * warna `sessionStorage` — tab band, session khatam.
 *
 * NOTE: dono storage XSS ke against secure nahi hote. Production ke liye
 * httpOnly cookie behtar hai — us soorat mein backend ko cookie set karni hogi.
 * Demo/simple setup ke liye ye theek hai.
 */

import { api, setAccessToken } from "@/lib/api";
import type {
  LoginCredentials,
  Me,
  RegisterInput,
  TokenResponse,
} from "@/types/auth";

const ACCESS_KEY = "opalpos.access_token";
const REFRESH_KEY = "opalpos.refresh_token";

// --------------------------------------------------------------------------- //
// token storage
// --------------------------------------------------------------------------- //
export function storeTokens(
  tokens: TokenResponse,
  { remember = true }: { remember?: boolean } = {},
): void {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  // doosri storage mein purana token reh gaya to `restoreToken()` usay utha
  // sakti hai — is liye pehle wahan se saaf karo
  other.removeItem(ACCESS_KEY);
  other.removeItem(REFRESH_KEY);

  target.setItem(ACCESS_KEY, tokens.access_token);
  target.setItem(REFRESH_KEY, tokens.refresh_token);
  setAccessToken(tokens.access_token);
}

export function clearTokens(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_KEY);
    storage.removeItem(REFRESH_KEY);
  }
  setAccessToken(null);
}

/** Page reload ke baad token wapas api client ko dena. */
export function restoreToken(): string | null {
  if (typeof window === "undefined") return null;
  const token =
    localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY);
  setAccessToken(token);
  return token;
}

// --------------------------------------------------------------------------- //
// API calls
// --------------------------------------------------------------------------- //
export async function login({
  remember = true,
  ...credentials
}: LoginCredentials): Promise<TokenResponse> {
  const tokens = await api.post<TokenResponse>("/auth/login", credentials);
  storeTokens(tokens, { remember });
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
