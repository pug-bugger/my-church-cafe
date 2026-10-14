/**
 * Session lifetime rules, shared in spirit with the mobile app's copy
 * (`my-church-cafe-mobile/src/lib/session.ts`) — keep the two in step.
 *
 * The backend issues tokens that live `SESSION_IDLE_DAYS` (60 by default). The
 * client decides when to renew from the token's own `iat` / `exp`, so it needs
 * no clock or storage of its own:
 *
 *  - past `exp`                → the app went unopened too long: sign out and
 *                                wipe the session.
 *  - issued a day or more ago  → trade it for a fresh one, so the window counts
 *                                from this visit rather than from sign-in.
 *  - otherwise                 → nothing to do.
 */

/** Renew a token once it is at least this old. */
export const SESSION_REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

/** How often an app left open re-checks (a TV board can stay up for weeks). */
export const SESSION_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type SessionAction = "ok" | "refresh" | "expired";

type TokenTimes = { issuedAt: number | null; expiresAt: number | null };

/** `iat` / `exp` (as ms) from a JWT's payload, or null if it can't be read. */
export function readTokenTimes(token: string): TokenTimes | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { iat?: unknown; exp?: unknown };
    const seconds = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? v * 1000 : null;
    return { issuedAt: seconds(payload.iat), expiresAt: seconds(payload.exp) };
  } catch {
    return null;
  }
}

/** What to do with `token` right now. An unreadable token is left to the server. */
export function sessionAction(token: string, now = Date.now()): SessionAction {
  const times = readTokenTimes(token);
  if (!times) return "refresh";
  if (times.expiresAt !== null && now >= times.expiresAt) return "expired";
  if (times.issuedAt === null || now - times.issuedAt >= SESSION_REFRESH_AFTER_MS) {
    return "refresh";
  }
  return "ok";
}
