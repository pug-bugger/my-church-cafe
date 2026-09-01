"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, getStoredUser, AUTH_EVENT } from "@/lib/auth";

export type AppRole = "admin" | "personal" | "parishioner";

function readStoredRole(): AppRole {
  const r = getStoredUser<{ role?: string }>()?.role;
  if (r === "admin" || r === "personal" || r === "parishioner") return r;
  return "parishioner";
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
    if (!getAuthToken()) {
      setAllowed(false);
      router.replace(redirectTo);
      return;
    }
    const role = readStoredRole();
    const ok =
      mode === "admin" ? ADMIN_ONLY.includes(role) : STAFF_ROLES.includes(role);
    if (!ok) {
      setAllowed(false);
      router.replace(redirectTo);
      return;
    }
    setAllowed(true);
  }, [mode, redirectTo, router]);

  useEffect(() => {
    check();
    window.addEventListener(AUTH_EVENT, check);
    return () => window.removeEventListener(AUTH_EVENT, check);
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
