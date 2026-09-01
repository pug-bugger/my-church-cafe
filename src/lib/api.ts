/**
 * Thin fetch wrapper for the Express backend.
 *
 * Collapses the boilerplate that used to be copy-pasted across the store and
 * every component: resolve `NEXT_PUBLIC_API_URL`, attach the JWT, set JSON
 * headers, parse the body, and throw the server's `{ error }` message on a
 * non-2xx response. Behaviour is intentionally identical to the hand-rolled
 * versions it replaces.
 */
import { getAuthToken } from "./auth";

/** Error thrown for any non-2xx response; carries the HTTP status + body. */
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** Backend base URL (trailing slash trimmed), or throw if not configured. */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new ApiError("NEXT_PUBLIC_API_URL is not set", 0);
  return url.replace(/\/$/, "");
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body; serialized and sent with a JSON Content-Type. */
  body?: unknown;
  /** Multipart body; sent as-is (no JSON Content-Type). */
  formData?: FormData;
  /**
   * Auth behaviour:
   *  - `true`  → attach the token, throw if missing (protected route)
   *  - `false` → never attach a token (public route)
   *  - omitted → attach the token only if one is present
   */
  auth?: boolean;
  /** Message thrown when `auth: true` and no token is present. */
  authError?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Passed through to `fetch` (e.g. "include" to send cookies). */
  credentials?: RequestCredentials;
}

/**
 * Fetch `path` (absolute, or a `/api/...` path joined onto the base URL) and
 * return the parsed JSON. Returns `undefined` for 204 responses. Throws
 * {@link ApiError} on a non-2xx status.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    auth,
    authError = "Login required",
    signal,
    headers = {},
    credentials,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  const token = getAuthToken();
  if (auth === true && !token) {
    throw new ApiError(authError, 401);
  }
  if (token && auth !== false) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = /^https?:\/\//.test(path) ? path : `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    signal,
    credentials,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}
