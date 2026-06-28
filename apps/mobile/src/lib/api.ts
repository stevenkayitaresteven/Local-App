import { API_V1 } from "./config";
import { secureStorage, TOKEN_KEYS } from "./storage";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function onAuthExpired(cb: () => void): void {
  onUnauthorized = cb;
}

async function persistTokens(access: string, refresh: string): Promise<void> {
  setTokens(access, refresh);
  await Promise.all([
    secureStorage.set(TOKEN_KEYS.access, access),
    secureStorage.set(TOKEN_KEYS.refresh, refresh),
  ]);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_V1}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_V1}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    await persistTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !options._retry) {
    if (await tryRefresh()) {
      return request<T>(path, { ...options, _retry: true });
    }
    onUnauthorized?.();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } }).error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? "Habaye ikibazo", err?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], auth = true) => request<T>(path, { query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  persistTokens,
};
