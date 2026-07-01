import { Platform } from "react-native";
import type { ImageDto } from "@umuturanyi/shared";
import { API_URL, API_V1 } from "./config";
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

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Thrown on a network/CORS failure (the server is unreachable). Surface a clear,
    // actionable message instead of a generic error.
    throw new ApiError(
      0,
      "network",
      `Ntibyashobotse kugera kuri seriveri (${API_URL}). Reba ko API ikora.`,
    );
  }

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

/** A picked media asset, shaped to match expo-image-picker's result assets. */
export interface UploadableAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

/**
 * Upload a single picked image as multipart/form-data to `POST /uploads/images`.
 * Works on web (where the picker yields a blob/data URI) and native (where it
 * yields a file URI). Never set Content-Type by hand — the runtime fills in the
 * multipart boundary. Refreshes the token once on a 401, mirroring `request`.
 */
export async function uploadImage(asset: UploadableAsset, _retry = false): Promise<ImageDto> {
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const type = asset.mimeType ?? "image/jpeg";
  const form = new FormData();
  if (Platform.OS === "web") {
    const raw = await (await fetch(asset.uri)).blob();
    const blob = raw.type ? raw : new Blob([raw], { type });
    form.append("file", blob, name);
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append("file", { uri: asset.uri, name, type } as unknown as Blob);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_V1}/uploads/images`, { method: "POST", headers, body: form });
  } catch {
    throw new ApiError(0, "network", `Ntibyashobotse kugera kuri seriveri (${API_URL}). Reba ko API ikora.`);
  }

  if (res.status === 401 && !_retry) {
    if (await tryRefresh()) return uploadImage(asset, true);
    onUnauthorized?.();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } }).error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? "Ifoto ntiyoherejwe", err?.details);
  }
  return (data as { image: ImageDto }).image;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], auth = true) => request<T>(path, { query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  uploadImage,
  persistTokens,
};
