"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { CafeIcon } from "@/components/CafeIcon";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getAuthToken, getStoredUser } from "@/lib/auth";

/** Who sees this nav item (guest = not signed in → same as parishioner). */
type NavVisibility = "public" | "staff" | "admin";

type NavLink = {
  href: string;
  label: string;
  available: boolean;
  visibility: NavVisibility;
};

const BASE_LINKS: NavLink[] = [
  { href: "/terminal", label: "Terminal", available: true, visibility: "staff" },
  { href: "/menu", label: "Menu", available: true, visibility: "public" },
  { href: "/orders", label: "Orders", available: true, visibility: "public" },
  { href: "/barista", label: "Barista", available: true, visibility: "staff" },
  { href: "/admin", label: "Manage", available: true, visibility: "admin" },
  { href: "/profile", label: "Profile", available: true, visibility: "public" },
];

function navLinkVisible(
  visibility: NavVisibility,
  role: string | null
): boolean {
  if (visibility === "public") return true;
  if (visibility === "staff") return role === "admin" || role === "personal";
  return role === "admin";
}

export function Navigation() {
  const pathname = usePathname();
  /** Role from session; null when not signed in (nav treats like parishioner). */
  const [navRole, setNavRole] = useState<string | null>(null);
  const [links, setLinks] = useState<NavLink[]>(BASE_LINKS);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchUserRole = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setNavRole(null);
      return;
    }
    const stored = getStoredUser<{ role?: string }>();
    if (stored) {
      setNavRole(stored.role ?? null);
      return;
    }
    try {
      const user = await apiFetch<{ role?: string }>("/api/users/me", {
        auth: true,
      });
      // Cache the fetched user without broadcasting a session change (that
      // would needlessly reconnect the socket / re-run route guards).
      if (typeof window !== "undefined") {
        window.localStorage.setItem("user", JSON.stringify(user));
      }
      setNavRole(user?.role ?? null);
    } catch {
      setNavRole(null);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();
    const onAuth = () => fetchUserRole();
    window.addEventListener("auth:token", onAuth);
    return () => window.removeEventListener("auth:token", onAuth);
  }, [fetchUserRole]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleLinks = links.filter((link) =>
    navLinkVisible(link.visibility, navRole)
  );

  const disabledStyle = ({ available }: { available: boolean }): CSSProperties =>
    available
      ? { cursor: "pointer" }
      : { cursor: "not-allowed", opacity: 0.5 };

  const unlockLink = (href: string, label: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.href === href ? { ...l, available: true } : l))
    );
    toast.success(`${label} unlocked`);
  };

  const renderLink = (link: NavLink, className: string) => (
    <Link
      key={link.href}
      href={link.href}
      className={cn(
        "rounded-md font-medium transition-colors hover:text-primary",
        pathname === link.href ? "text-primary" : "text-muted-foreground",
        link.available ? "" : "bg-caution-stripes",
        className
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
          unlockLink(link.href, link.label);
        }
      }}
    >
      {link.label}
    </Link>
  );

  const currentLabel =
    pathname !== "/"
      ? links.find((l) => l.href === pathname)?.label ??
        pathname.replace(/^\//, "").charAt(0).toUpperCase() + pathname.slice(2)
      : null;

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-lg font-bold sm:text-xl"
            >
              <CafeIcon size={32} />
              <span>Church Cafe</span>
            </Link>
            {currentLabel && (
              <span className="ml-1 hidden truncate text-sm font-medium text-muted-foreground sm:inline">
                / {currentLabel}
              </span>
            )}
          </div>

          {/* Desktop links */}
          <div className="hidden items-center gap-4 md:flex">
            {visibleLinks.map((link) =>
              renderLink(link, "px-2 py-1 text-sm")
            )}
            <ModeToggle />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <ModeToggle />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="flex flex-col gap-1 border-t py-2 md:hidden">
            {visibleLinks.map((link) =>
              renderLink(link, "px-3 py-2 text-base")
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
