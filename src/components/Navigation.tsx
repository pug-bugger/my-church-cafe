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
import { initialsFromName } from "@/lib/format";
import { useWebSocket } from "@/context/WebSocketContext";

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
  { href: "/barista", label: "Barista", available: true, visibility: "staff" },
  { href: "/orders", label: "Board", available: true, visibility: "public" },
  { href: "/menu", label: "Menu", available: true, visibility: "public" },
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

type SessionUser = { name?: string; role?: string };

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useWebSocket();
  /** Role from session; null when not signed in (nav treats like parishioner). */
  const [navRole, setNavRole] = useState<string | null>(null);
  const [navName, setNavName] = useState<string | null>(null);
  const [links, setLinks] = useState<NavLink[]>(BASE_LINKS);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchUserRole = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setNavRole(null);
      setNavName(null);
      return;
    }
    const stored = getStoredUser<SessionUser>();
    if (stored) {
      setNavRole(stored.role ?? null);
      setNavName(stored.name ?? null);
      return;
    }
    try {
      const user = await apiFetch<SessionUser>("/api/users/me", {
        auth: true,
      });
      // Cache the fetched user without broadcasting a session change (that
      // would needlessly reconnect the socket / re-run route guards).
      if (typeof window !== "undefined") {
        window.localStorage.setItem("user", JSON.stringify(user));
      }
      setNavRole(user?.role ?? null);
      setNavName(user?.name ?? null);
    } catch {
      setNavRole(null);
      setNavName(null);
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
  const signedIn = navRole !== null;

  const disabledStyle = ({ available }: { available: boolean }): CSSProperties =>
    available ? { cursor: "pointer" } : { cursor: "not-allowed", opacity: 0.5 };

  const unlockLink = (href: string, label: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.href === href ? { ...l, available: true } : l))
    );
    toast.success(`${label} unlocked`);
  };

  /** Pill-shaped nav item: filled with the accent when it is the current page. */
  const renderLink = (link: NavLink, className: string) => {
    const active = pathname === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "press flex items-center justify-center rounded-full",
          active
            ? "bg-primary font-bold text-primary-foreground"
            : "font-medium text-muted-foreground hover:bg-ink/5 hover:text-foreground",
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
  };

  return (
    <header className="sticky top-0 z-20 flex-none border-b border-line bg-background/90 backdrop-blur-[10px]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-[17px] font-extrabold tracking-[-0.01em]"
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[11px] bg-primary text-primary-foreground">
            <CafeIcon size={16} />
          </span>
          Church Cafe
        </Link>

        {/* Desktop links — one pill group, current page filled */}
        <nav className="hidden gap-1 rounded-full border border-line bg-surface p-1 md:flex">
          {visibleLinks.map((link) =>
            renderLink(link, "min-h-10 px-4 text-sm")
          )}
        </nav>

        <span className="flex-1" />

        {/* Realtime status — only meaningful once there is a socket to connect */}
        {signedIn && (
          <span
            className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
            title={
              isConnected
                ? "Live connection to the order server"
                : "Not connected — orders may be out of date"
            }
          >
            <span
              className={cn(
                "h-[7px] w-[7px] rounded-full",
                isConnected ? "bg-primary" : "bg-muted-foreground/50"
              )}
            />
            {isConnected ? "Live" : "Offline"}
          </span>
        )}

        <ModeToggle />

        {signedIn && (
          <Link
            href="/profile"
            className="hidden items-center gap-2.5 text-[13px] text-muted-foreground hover:text-foreground sm:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ac-soft text-xs font-bold text-ac-dark">
              {initialsFromName(navName)}
            </span>
            <span className="max-w-[10ch] truncate">
              {navName?.split(" ")[0] ?? "Account"}
            </span>
          </Link>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-line px-4 py-2 md:hidden">
          {visibleLinks.map((link) =>
            renderLink(link, "min-h-12 justify-start px-4 text-base")
          )}
        </div>
      )}
    </header>
  );
}
