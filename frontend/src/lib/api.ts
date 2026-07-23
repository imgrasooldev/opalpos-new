/**
 * Backend API client.
 *
 * Backend har response ko ek hi envelope mein bhejta hai
 * (backend/app/utils/response.py):
 *
 *   success: { success: true,  message, data, meta }
 *   error:   { success: false, message, errors }
 *
 * Ye client wo envelope unwrap karta hai, `data` return karta hai, aur error par
 * `ApiError` throw karta hai — taake har component mein `if (res.success)` na
 * likhna pare.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

export type ApiMeta = {
  total: number;
  page: number;
  size: number;
  pages: number;
};

type Envelope<T> =
  | { success: true; message: string | null; data: T; meta: ApiMeta | null }
  | { success: false; message: string; errors: ApiFieldError[] | null };

export type ApiFieldError = {
  field: string;
  message: string;
  type: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: ApiFieldError[] | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 422 validation errors ko form field names par map karo. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.errors ?? []) out[e.field] = e.message;
    return out;
  }
}

/** Access token. Server components mein cookie se, client par memory + refresh se. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Query string params — undefined/null values skip ho jate hain. */
  params?: Record<string, string | number | boolean | undefined | null>;
};

/** Envelope ke saath poora response, jab pagination `meta` bhi chahiye ho. */
export async function requestWithMeta<T>(
  path: string,
  { body, params, headers, ...init }: RequestOptions = {},
): Promise<{ data: T; meta: ApiMeta | null }> {
  const url = new URL(`${API_PREFIX}${path}`, BASE_URL);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — koi body nahi
  if (res.status === 204) return { data: undefined as T, meta: null };

  let payload: Envelope<T>;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`Server returned ${res.status} with a non-JSON body`, res.status);
  }

  if (!res.ok || !payload.success) {
    const failed = payload as Extract<Envelope<T>, { success: false }>;
    throw new ApiError(failed.message ?? `Request failed (${res.status})`, res.status, failed.errors);
  }

  return { data: payload.data, meta: payload.meta };
}

/** Aam istemal — sirf `data` chahiye. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await requestWithMeta<T>(path, options);
  return data;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
  /** List endpoints — `meta` mein pagination aati hai. */
  list: <T>(path: string, params?: RequestOptions["params"]) =>
    requestWithMeta<T[]>(path, { method: "GET", params }),
};
