"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { APP_VERSION, type ServerVersion } from "@/lib/version";
import { cn } from "@/lib/utils";

/**
 * The build stamp at the foot of Profile.
 *
 * Two numbers, because there are two deployables: this bundle's version is
 * inlined at build time, the backend's is asked for. When a bug report says
 * "v1.0.1 · server v1.0.0" that is a half-finished deploy, and saying so is the
 * whole point of printing both.
 *
 * The server line is additive — if the backend is unreachable, or old enough
 * not to serve `/api/version`, the footer quietly shows just this app's
 * version. It is never worth an error state.
 */
export function VersionFooter({ className }: { className?: string }) {
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<ServerVersion>("/api/version", {
      auth: false,
      signal: controller.signal,
    })
      .then((data) => setServerVersion(data?.version ?? null))
      .catch(() => {
        // Offline, unconfigured, or an older backend. Nothing to report.
      });
    return () => controller.abort();
  }, []);

  return (
    <p
      className={cn(
        "num mt-8 text-center text-xs text-muted-foreground",
        className
      )}
    >
      v{APP_VERSION}
      {serverVersion ? ` · server v${serverVersion}` : ""}
    </p>
  );
}
