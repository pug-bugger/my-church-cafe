"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/i18n";

/**
 * Google's own "Sign in with Google" button (Google Identity Services).
 *
 * The button hands back an ID token (`credential`); what happens with it is
 * the caller's — the sign-in view posts it to `POST /api/auth/google`, the
 * account settings post it to `POST /api/auth/google/link`. The server
 * verifies it, so nothing here is trusted.
 *
 * The client id comes from the backend (`GET /api/auth/google/config`) rather
 * than a `NEXT_PUBLIC_*` variable, so turning Google on or off is a server
 * `.env` change, not a rebuild. When the server has it off, this renders
 * nothing.
 */

type GoogleConfig = { enabled: boolean; clientId: string | null };

type GsiButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
  locale?: string;
};

type GsiApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonOptions) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiApi } };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";

// Both are fetched once per page load and shared by every button.
let configPromise: Promise<GoogleConfig> | null = null;
let scriptPromise: Promise<GsiApi> | null = null;

function loadConfig(): Promise<GoogleConfig> {
  configPromise ??= apiFetch<GoogleConfig>("/api/auth/google/config", {
    auth: false,
  }).catch(() => {
    configPromise = null; // let a later mount retry
    return { enabled: false, clientId: null };
  });
  return configPromise;
}

function loadGsi(): Promise<GsiApi> {
  scriptPromise ??= new Promise<GsiApi>((resolve, reject) => {
    const ready = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("Google Identity Services unavailable"));
    };
    if (window.google?.accounts?.id) return ready();
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(script);
  }).catch((err) => {
    scriptPromise = null;
    throw err;
  });
  return scriptPromise;
}

type Props = {
  /** Called with the Google ID token once the person picks an account. */
  onCredential: (credential: string) => void;
  text?: GsiButtonOptions["text"];
  className?: string;
};

export function GoogleSignInButton({
  onCredential,
  text = "continue_with",
  className,
}: Props) {
  const { t, locale } = useTranslation();
  const { resolvedTheme } = useTheme();
  const holder = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<GoogleConfig | null>(null);
  const [failed, setFailed] = useState(false);

  // Keep the latest callback without re-rendering Google's button for it.
  const callback = useRef(onCredential);
  callback.current = onCredential;

  useEffect(() => {
    let alive = true;
    void loadConfig().then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.clientId) return;
    let alive = true;
    loadGsi()
      .then((gsi) => {
        const el = holder.current;
        if (!alive || !el) return;
        // `initialize` is page-global; only one button is on screen at a
        // time, and re-initialising points the callback at this one.
        gsi.initialize({
          client_id: config.clientId!,
          callback: (res) => {
            if (res.credential) callback.current(res.credential);
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        el.innerHTML = "";
        gsi.renderButton(el, {
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text,
          // Google caps the width at 400px; fit the card, whatever it is.
          width: Math.min(400, Math.max(200, Math.floor(el.offsetWidth))),
          locale,
        });
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [config, resolvedTheme, locale, text]);

  if (!config?.enabled) return null;

  return (
    <div className={className}>
      {/* Fixed height so the card doesn't jump when Google's iframe lands. */}
      <div ref={holder} className="flex min-h-[44px] w-full justify-center" />
      {failed && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("auth.google.unavailable")}
        </p>
      )}
    </div>
  );
}

/** Whether the server has Google sign-in on — for a caller's own chrome. */
export function useGoogleSignInEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadConfig().then((c) => alive && setEnabled(c.enabled));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}
