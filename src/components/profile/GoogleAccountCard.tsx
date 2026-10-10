"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useTranslation } from "@/i18n";

type LinkStatus = {
  linked: boolean;
  email: string | null;
  linked_at: string | null;
  has_password: boolean;
};

/**
 * Connect / disconnect a Google account, in Profile → Account.
 *
 * Any Google account can be connected — its email needn't match the app
 * account's. (Signing in with Google links automatically only when the emails
 * do match; this is the way to link one that doesn't.) Hidden entirely when
 * the server has Google sign-in off.
 */
export function GoogleAccountCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      setStatus(await apiFetch<LinkStatus>("/api/auth/google/link", { auth: true }));
    } catch {
      // 503: not configured / not migrated. Nothing to offer.
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async (credential: string) => {
    setBusy(true);
    try {
      const next = await apiFetch<LinkStatus>("/api/auth/google/link", {
        method: "POST",
        body: { credential },
        auth: true,
      });
      setStatus(next);
      toast.success(t("profile.account.google.connected"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("profile.account.google.couldNotConnect")
      );
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const next = await apiFetch<LinkStatus>("/api/auth/google/link", {
        method: "DELETE",
        auth: true,
      });
      setStatus(next);
      toast.success(t("profile.account.google.disconnected"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("profile.account.google.couldNotDisconnect")
      );
    } finally {
      setBusy(false);
    }
  };

  if (!available) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{t("profile.account.google.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("profile.account.google.hint")}
        </p>
      </CardHeader>
      <CardContent>
        {!status ? (
          <Skeleton className="h-11 w-full max-w-sm" />
        ) : status.linked ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 break-all text-[15px] font-semibold">
                {t("profile.account.google.connectedAs", {
                  email: status.email ?? "—",
                })}
              </p>
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={busy || !status.has_password}
                className="press min-h-[46px] rounded-ctl border border-line bg-surface px-5 text-[15px] font-semibold hover:bg-ink/5 disabled:opacity-60"
              >
                {busy
                  ? t("profile.account.google.disconnecting")
                  : t("profile.account.google.disconnect")}
              </button>
            </div>
            {!status.has_password && (
              <p className="text-sm text-muted-foreground">
                {t("profile.account.google.needsPassword")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t("profile.account.google.notConnected")}
            </p>
            <div className={busy ? "pointer-events-none opacity-60" : undefined}>
              <GoogleSignInButton
                text="continue_with"
                className="w-full max-w-sm"
                onCredential={(c) => void connect(c)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
