"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ProductTable } from "@/components/admin/ProductTable";
import { DrinkOptionManagement } from "@/components/admin/DrinkOptionManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { OrdersReportSection } from "@/components/admin/OrdersReportSection";

/**
 * Manage is a rail of four workspaces rather than one long scroll — the
 * canvas' Manage screen. The rail collapses to a scrolling pill row on phones.
 */

type TabId = "products" | "options" | "users" | "reports";

const TABS: { id: TabId; label: string; tip: string }[] = [
  {
    id: "products",
    label: "Products",
    tip: "Prices, visibility, which options each item offers",
  },
  {
    id: "options",
    label: "Options",
    tip: "Reusable questions like Milk or Take away",
  },
  { id: "users", label: "People", tip: "Accounts and roles" },
  { id: "reports", label: "Reports", tip: "Export line items" },
];

export function ManageTabs() {
  const drinks = useAppStore((state) => state.drinks);
  const desserts = useAppStore((state) => state.desserts);
  const [tab, setTab] = useState<TabId>("products");
  const [optionCount, setOptionCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  // The rail shows counts before a tab is ever opened, so fetch the two the
  // store does not already hold.
  useEffect(() => {
    if (!getAuthToken()) return;
    let active = true;
    const load = async () => {
      try {
        const [options, users] = await Promise.all([
          // Drink options are a public list; the directory is not.
          apiFetch<unknown[]>("/api/drink-options", { auth: false }),
          apiFetch<unknown[]>("/api/users", { auth: true }),
        ]);
        if (!active) return;
        setOptionCount(Array.isArray(options) ? options.length : null);
        setUserCount(Array.isArray(users) ? users.length : null);
      } catch {
        // Counts are decoration; the tabs still work without them.
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo<Record<TabId, number | null>>(
    () => ({
      products: drinks.length + desserts.length,
      options: optionCount,
      users: userCount,
      reports: null,
    }),
    [drinks.length, desserts.length, optionCount, userCount]
  );

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[196px_1fr]">
      <nav
        aria-label="Manage sections"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:sticky lg:top-[88px] lg:flex-col lg:overflow-visible lg:px-0"
      >
        {TABS.map((item) => {
          const on = tab === item.id;
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              aria-current={on ? "page" : undefined}
              title={item.tip}
              onClick={() => setTab(item.id)}
              className={cn(
                "press flex min-h-[46px] flex-none items-center justify-between gap-2 whitespace-nowrap rounded-[14px] px-4 text-[15px] font-semibold lg:w-full",
                on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-ink/5"
              )}
            >
              <span>{item.label}</span>
              {count !== null && (
                <span className="num text-xs opacity-55">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        {tab === "products" && <ProductTable />}
        {tab === "options" && <DrinkOptionManagement />}
        {tab === "users" && <UserManagement />}
        {tab === "reports" && <OrdersReportSection />}
      </div>
    </div>
  );
}
