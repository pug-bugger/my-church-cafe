"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useTranslation, type MessageKey, type TranslateFn } from "@/i18n";
import { getAuthToken } from "@/lib/auth";

type PrinterStatus = {
  reachable: boolean;
  configured: boolean;
  host: string | null;
  port: number;
  lastCheckedAt: number | null;
  lastPrintOk: boolean | null;
  lastError: string | null;
};

type LinkState = "connected" | "disconnected" | "unconfigured" | "checking";

const POLL_INTERVAL_MS = 6000;

// The palette has no red; "attention" is the warm warn tone and "not set up
// yet" is inert neutral. Every badge carries its label, so state is never
// signalled by colour alone.
const BADGE_STYLES: Record<LinkState, string> = {
  connected: "bg-ac-soft text-ac-dark",
  disconnected: "bg-warn-soft text-warn",
  unconfigured: "bg-neutral-soft text-muted-foreground",
  checking: "bg-muted text-muted-foreground",
};

const BADGE_LABEL_KEYS: Record<LinkState, MessageKey> = {
  connected: "settings.printer.badge.connected",
  disconnected: "settings.printer.badge.disconnected",
  unconfigured: "settings.printer.badge.unconfigured",
  checking: "settings.printer.badge.checking",
};

function StatusBadge({ state, t }: { state: LinkState; t: TranslateFn }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_STYLES[state],
      )}
    >
      {t(BADGE_LABEL_KEYS[state])}
    </span>
  );
}

export function PrinterStatusCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const data = await apiFetch<PrinterStatus>("/api/device/status", {
        auth: true,
      });
      setStatus(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const linkState: LinkState = !status
    ? "checking"
    : !status.configured
      ? "unconfigured"
      : status.reachable
        ? "connected"
        : "disconnected";

  const showFix = linkState === "disconnected" || linkState === "unconfigured";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("settings.printer.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && (
          <p className="text-sm text-muted-foreground">
            {t("settings.printer.unreachableBackend")}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm">{t("settings.printer.link")}</span>
            {status?.configured && status.host && (
              <span className="text-xs text-muted-foreground">
                {status.host}:{status.port}
              </span>
            )}
          </div>
          <StatusBadge state={linkState} t={t} />
        </div>

        {linkState === "unconfigured" && (
          <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm" open>
            <summary className="cursor-pointer font-medium text-muted-foreground">
              {t("settings.printer.setup.title")}
            </summary>
            {/* The identifiers inside these sentences (PRINTER_HOST, .env) are
                part of the translated string rather than wrapped in <code>:
                where they fall in a sentence differs by language, and a
                placeholder that has to be re-wrapped per language is a worse
                trade than losing the monospace. */}
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t("settings.printer.setup.step1")}</li>
              <li>{t("settings.printer.setup.step2")}</li>
              <li>{t("settings.printer.setup.step3")}</li>
            </ul>
          </details>
        )}

        {linkState === "disconnected" && (
          <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              {t("settings.printer.fix.title")}
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t("settings.printer.fix.step1")}</li>
              <li>{t("settings.printer.fix.step2")}</li>
              <li>
                {t("settings.printer.fix.step3", {
                  current: status?.host
                    ? t("settings.printer.fix.currentHost", {
                        host: status.host,
                      })
                    : "",
                })}
              </li>
              <li>
                {t("settings.printer.fix.step4", {
                  host:
                    status?.host || t("settings.printer.fix.unknownHost"),
                })}
              </li>
              <li>
                {t("settings.printer.fix.step5", { port: status?.port ?? 9100 })}
              </li>
            </ul>
          </details>
        )}

        {status?.lastError && linkState !== "connected" && (
          <p className="text-xs text-muted-foreground">
            {t("settings.printer.lastError", { message: status.lastError })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
