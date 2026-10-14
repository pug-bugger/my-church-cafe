"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AUTH_EVENT,
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from "@/lib/auth";
import { SESSION_CHECK_INTERVAL_MS, sessionAction } from "@/lib/session";
import { useAppStore } from "@/store";

type RefreshResponse = { token: string; user?: Record<string, unknown> };

/**
 * Keeps the sign-in alive while the app is in use, and ends it once the app
 * has gone unopened for the server's `SESSION_IDLE_DAYS` (see `lib/session`).
 *
 * Checks when the page loads, whenever the tab comes back into view, and
 * hourly while it stays open. Renders nothing.
 */
export function SessionKeeper() {
  const router = useRouter();
  const { t } = useTranslation();
  const refreshing = useRef(false);

  useEffect(() => {
    const expire = () => {
      clearAuthSession();
      toast.message(t("auth.sessionExpired"));
      router.replace("/profile");
    };

    const check = async () => {
      const token = getAuthToken();
      if (!token || refreshing.current) return;
      const action = sessionAction(token);
      if (action === "expired") return expire();
      if (action !== "refresh") return;

      refreshing.current = true;
      try {
        const data = await apiFetch<RefreshResponse>("/api/auth/refresh", {
          method: "POST",
          auth: true,
        });
        // Signed out (or in as someone else) in another tab meanwhile.
        if (getAuthToken() !== token || !data?.token) return;
        setAuthSession(data.token, { ...(getStoredUser() ?? {}), ...data.user });
      } catch (err) {
        // Only the server saying no ends the session; offline, keep the
        // current token and try again at the next check.
        if (getAuthToken() !== token) return;
        if (err instanceof ApiError && err.status === 401) expire();
      } finally {
        refreshing.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), SESSION_CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [router, t]);

  // Whenever the session ends — timed out or signed out — drop what belonged to
  // it, so a half-built order never carries over to whoever signs in next.
  useEffect(() => {
    let hadToken = Boolean(getAuthToken());
    const onAuthChange = () => {
      const hasToken = Boolean(getAuthToken());
      if (hadToken && !hasToken) {
        const { clearDraft, setOrders } = useAppStore.getState();
        clearDraft();
        setOrders([]);
      }
      hadToken = hasToken;
    };
    window.addEventListener(AUTH_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_EVENT, onAuthChange);
  }, []);

  return null;
}
