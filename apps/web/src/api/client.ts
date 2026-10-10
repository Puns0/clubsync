// ─── API Client ───
// Single fetch wrapper for all server access. Handles:
// - Cookie credentials (httpOnly session)
// - CSRF token on mutations
// - Error shape parsing
// - Mock mode switching

import type { ApiError, ApiResult } from "./types";

let csrfToken: string | null = null;

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

async function fetchCsrfToken(): Promise<string> {
  if (USE_MOCKS) return "mock-csrf-token";
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/auth/csrf`,
    { credentials: "include" }
  );
  const data = await res.json();
  csrfToken = data.token || data.csrfToken || "";
  return csrfToken || "";
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | undefined>;
}

async function request<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  if (USE_MOCKS) {
    // Dynamically import mock adapter to tree-shake in production
    const { mockRequest } = await import("./mock/adapter");
    return mockRequest<T>(url, opts);
  }

  const { method = "GET", body, headers = {}, params } = opts;

  // Append query params
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") searchParams.set(k, v);
    });
    const qs = searchParams.toString();
    if (qs) fullUrl = `${url}?${qs}`;
  }

  // Add CSRF token on mutations
  const isMutation = method !== "GET";
  if (isMutation && !headers["X-CSRF-Token"]) {
    const token = await getCsrfToken();
    headers["X-CSRF-Token"] = token;
  }

  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  // Handle no-content responses
  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    const apiError = json as ApiError;
    const error = new ApiClientError(
      apiError.error?.message || res.statusText,
      res.status,
      apiError.error
    );
    throw error;
  }

  // Unwrap { data: T } envelope if present
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

export class ApiClientError extends Error {
  status: number;
  detail: ApiError["error"] | undefined;

  constructor(message: string, status: number, detail?: ApiError["error"]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get fieldErrors(): Record<string, string> {
    return this.detail?.fields || {};
  }

  get retryAfter(): number | undefined {
    return this.detail?.retryAfter;
  }
}

// ─── Public API ───

export const api = {
  get: <T>(url: string, params?: Record<string, string | undefined>) =>
    request<T>(url, { method: "GET", params }),

  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body }),

  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body }),

  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body }),

  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
