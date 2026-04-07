"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AppRole = "admin" | "personal" | "parishioner";

function readStoredRole(): AppRole {
  if (typeof window === "undefined") return "parishioner";
  const raw = localStorage.getItem("user");
  if (!raw) return "parishioner";
  try {
    const r = JSON.parse(raw)?.role as string | undefined;
    if (r === "admin" || r === "personal" || r === "parishioner") return r;
    return "parishioner";
  } catch {
    return "parishioner";
  }
}

function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken")
  );
}

const STAFF_ROLES: AppRole[] = ["admin", "personal"];
const ADMIN_ONLY: AppRole[] = ["admin"];

type RoleRouteGuardProps = {
  mode: "staff" | "admin";
  redirectTo?: string;
  children: React.ReactNode;
};

export function RoleRouteGuard({
  mode,
  redirectTo = "/menu",
  children,
}: RoleRouteGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const check = useCallback(() => {
    if (!hasAuthToken()) {
      setAllowed(false);
      router.replace(redirectTo);
      return;
    }
    const role = readStoredRole();
    const ok =
      mode === "admin"
        ? ADMIN_ONLY.includes(role)
        : STAFF_ROLES.includes(role);
    if (!ok) {
      setAllowed(false);
      router.replace(redirectTo);
      return;
    }
    setAllowed(true);
  }, [mode, redirectTo, router]);

  useEffect(() => {
    check();
    window.addEventListener("auth:token", check);
    return () => window.removeEventListener("auth:token", check);
  }, [check]);

  if (allowed === false) return null;
  if (allowed !== true) {
    return (
      <div className="container mx-auto py-12 text-center text-muted-foreground text-sm">
        Checking access…
      </div>
    );
  }
  return <>{children}</>;
}
