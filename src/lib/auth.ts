/**
 * Single source of truth for the browser-side auth session.
 *
 * The JWT is read from `localStorage` under any of a few legacy keys, and the
 * app re-checks auth state by listening for the `auth:token` window event.
 * Components must use these helpers instead of hand-rolling `localStorage`
 * access so the key list and event name stay in one place.
 */

/** localStorage keys the token may live under (first non-empty wins). */
const TOKEN_KEYS = ["token", "jwt", "accessToken"] as const;

/** Canonical key new tokens are written to. */
const PRIMARY_TOKEN_KEY = TOKEN_KEYS[0];

/** Window event fired whenever the session changes; listeners re-check auth. */
export const AUTH_EVENT = "auth:token";

/** Current JWT, or null when signed out / on the server. */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

/** Cached user object persisted alongside the token, or null. */
export function getStoredUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Notify the app (nav, socket, guards) that the session changed. */
export function emitAuthChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Persist a fresh session and broadcast the change. */
export function setAuthSession(token: string, user?: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIMARY_TOKEN_KEY, token);
  if (user !== undefined) {
    window.localStorage.setItem("user", JSON.stringify(user));
  }
  emitAuthChange();
}

/** Persist an updated cached user without touching the token. */
export function setStoredUser(user: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("user", JSON.stringify(user));
  emitAuthChange();
}

/** Clear every token key + cached user and broadcast the change. */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  for (const key of TOKEN_KEYS) window.localStorage.removeItem(key);
  window.localStorage.removeItem("user");
  emitAuthChange();
}
