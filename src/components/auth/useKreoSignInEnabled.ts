"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Whether the server offers "Sign in with Kreo" (`GET /api/auth/kreo/config`).
 *
 * Kreo's integration token lives only on the backend, so turning Kreo on or
 * off is a server `.env` change, not a rebuild. Fetched once per page load.
 */
let configPromise: Promise<boolean> | null = null;

function loadEnabled(): Promise<boolean> {
  configPromise ??= apiFetch<{ enabled: boolean }>("/api/auth/kreo/config", {
    auth: false,
  })
    .then((c) => c.enabled === true)
    .catch(() => {
      configPromise = null; // try again next time
      return false;
    });
  return configPromise;
}

export function useKreoSignInEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadEnabled().then((on) => alive && setEnabled(on));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
