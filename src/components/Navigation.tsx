"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, useCallback, type CSSProperties } from "react";

const BASE_LINKS = [
  { href: "/terminal", label: "Terminal", available: true, adminOnly: false },
  { href: "/orders", label: "Orders", available: true, adminOnly: false },
  { href: "/barista", label: "Barista", available: true, adminOnly: false },
  { href: "/admin", label: "Manage", available: true, adminOnly: true },
  { href: "/profile", label: "Profile", available: true, adminOnly: false },
];

export function Navigation() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [links, setLinks] = useState(BASE_LINKS);

  const fetchUserRole = useCallback(async () => {
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) {
      setIsAdmin(false);
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setIsAdmin(user?.role === "admin");
        return;
      } catch {
        // fall through to fetch
      }
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const user = await res.json();
      localStorage.setItem("user", JSON.stringify(user));
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();
    const onAuth = () => fetchUserRole();
    window.addEventListener("auth:token", onAuth);
    return () => window.removeEventListener("auth:token", onAuth);
  }, [fetchUserRole]);

  const visibleLinks = links.filter(
    (link) => !link.adminOnly || (link.adminOnly && isAdmin)
  );

  const disabledStyle = ({ available }: { available: boolean }) => {
    const tabClickable: CSSProperties = {};
    if (available) {
      tabClickable.cursor = "pointer";
    } else {
      tabClickable.cursor = "not-allowed";
      tabClickable.opacity = 0.5;
    }
    return tabClickable;
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <img src="/cup.svg" alt="Church Cafe" className="w-8 h-8" />
              Church Cafe
            </Link>
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {pathname !== "/" && (
                <>
                  / {links.find((l) => l.href === pathname)?.label ?? pathname.replace(/^\//, "").charAt(0).toUpperCase() + pathname.slice(2)}
                </>
              )}
            </span>
          </div>

          <div className="flex gap-4">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary rounded-md px-2 py-1",
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground",
                  link.available ? "" : "bg-caution-stripes"
                )}
                style={disabledStyle(link)}
                aria-disabled={!link.available}
                onClick={(e) => {
                  if (!link.available) {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.info("This feature is not available yet.");
                  }
                }}
                onDoubleClick={(e) => {
                  if (!link.available) {
                    e.preventDefault();
                    e.stopPropagation();
                    setLinks((prev) =>
                      prev.map((l) =>
                        l.href === link.href ? { ...l, available: true } : l
                      )
                    );
                    toast.success(`${link.label} unlocked`);
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
