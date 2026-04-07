"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { ModeToggle } from "@/components/mode-toggle";

/** Who sees this nav item (guest = not signed in → same as parishioner). */
type NavVisibility = "public" | "staff" | "admin";

const BASE_LINKS = [
  {
    href: "/terminal",
    label: "Terminal",
    available: true,
    visibility: "staff" satisfies NavVisibility,
  },
  {
    href: "/menu",
    label: "Menu",
    available: true,
    visibility: "public" satisfies NavVisibility,
  },
  {
    href: "/orders",
    label: "Orders",
    available: true,
    visibility: "public" satisfies NavVisibility,
  },
  {
    href: "/barista",
    label: "Barista",
    available: true,
    visibility: "staff" satisfies NavVisibility,
  },
  {
    href: "/admin",
    label: "Manage",
    available: true,
    visibility: "admin" satisfies NavVisibility,
  },
  {
    href: "/profile",
    label: "Profile",
    available: true,
    visibility: "public" satisfies NavVisibility,
  },
] as const;

function navLinkVisible(
  visibility: NavVisibility,
  role: string | null
): boolean {
  if (visibility === "public") return true;
  if (visibility === "staff")
    return role === "admin" || role === "personal";
  return role === "admin";
}

export function Navigation() {
  const pathname = usePathname();
  /** Role from session; null when not signed in (nav treats like parishioner). */
  const [navRole, setNavRole] = useState<string | null>(null);
  const [links, setLinks] = useState([...BASE_LINKS]);
  const [showOnOrders, setShowOnOrders] = useState(false);
  const isOrdersPage = false;//pathname === "/orders";

  const fetchUserRole = useCallback(async () => {
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) {
      setNavRole(null);
      return;
    }
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored) as { role?: string };
        setNavRole(user?.role ?? null);
        return;
      } catch {
        // fall through to fetch
      }
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setNavRole(null);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setNavRole(null);
        return;
      }
      const user = await res.json();
      localStorage.setItem("user", JSON.stringify(user));
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

  const visibleLinks = links.filter((link) =>
    navLinkVisible(link.visibility, navRole)
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
    <>
      {isOrdersPage && (
        <div
          className="fixed inset-x-0 top-0 z-40 h-4"
          onMouseEnter={() => setShowOnOrders(true)}
          onMouseLeave={() => setShowOnOrders(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={cn(
          "border-b bg-background transition-transform duration-200",
          isOrdersPage && "fixed inset-x-0 top-0 z-50",
          isOrdersPage && !showOnOrders && "-translate-y-full",
          isOrdersPage && showOnOrders && "translate-y-0"
        )}
        onMouseEnter={() => {
          if (isOrdersPage) setShowOnOrders(true);
        }}
        onMouseLeave={() => {
          if (isOrdersPage) setShowOnOrders(false);
        }}
      >
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

            <div className="flex items-center gap-4">
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
              <ModeToggle />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
