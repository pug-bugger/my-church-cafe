"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
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

const BADGE_LABELS: Record<LinkState, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  unconfigured: "Not configured",
  checking: "Checking…",
};

function StatusBadge({ state }: { state: LinkState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_STYLES[state],
      )}
    >
      {BADGE_LABELS[state]}
    </span>
  );
}

export function PrinterStatusCard() {
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
        <CardTitle className="text-base">Printer connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && (
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t reach the backend to check printer status.
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm">Backend ↔ Printer</span>
            {status?.configured && status.host && (
              <span className="text-xs text-muted-foreground">
                {status.host}:{status.port}
              </span>
            )}
          </div>
          <StatusBadge state={linkState} />
        </div>

        {linkState === "unconfigured" && (
          <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm" open>
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Set up the printer
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Connect the printer to the same WiFi network as this server and
                note the IP address it gets (print a self-test page to see it).
              </li>
              <li>
                Set <code>PRINTER_HOST</code> to that IP address in the
                backend&apos;s <code>.env</code>, then restart the backend.
              </li>
              <li>
                Give the printer a static IP / DHCP reservation on your router
                so the address doesn&apos;t change on reboot.
              </li>
            </ul>
          </details>
        )}

        {linkState === "disconnected" && (
          <details className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Fix this
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Is the printer powered on and out of sleep/error state (paper loaded, cover closed)?</li>
              <li>Is it connected to the same WiFi network as this server?</li>
              <li>
                Has its IP address changed? Print a self-test page to check, and
                confirm it matches <code>PRINTER_HOST</code>
                {status?.host ? ` (currently ${status.host})` : ""}.
              </li>
              <li>Can the server reach it? Try <code>ping {status?.host || "<printer-ip>"}</code>.</li>
              <li>Is TCP port {status?.port ?? 9100} open (not blocked by a firewall/AP isolation)?</li>
            </ul>
          </details>
        )}

        {status?.lastError && linkState !== "connected" && (
          <p className="text-xs text-muted-foreground">Last error: {status.lastError}</p>
        )}
      </CardContent>
    </Card>
  );
}
