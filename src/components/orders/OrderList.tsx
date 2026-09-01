"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ServerOrder } from "@/types";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Guests have no realtime socket connection (that requires a JWT), so the
// board polls instead while unauthenticated.
const GUEST_POLL_INTERVAL_MS = 10000;

function orderLabel(order: ServerOrder): string {
  return order.customer_name?.trim() || String(order.order_number ?? order.id);
}

const isNumeric = (label: string) => /^\d+$/.test(label);

/**
 * Order labels are the whole point of this screen — a guest reads them from
 * across the room — so numbers run very large and names a size down.
 */
function BoardLabel({ label, onDark }: { label: string; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "enter font-extrabold leading-none tracking-[-0.03em]",
        isNumeric(label)
          ? "text-[clamp(3.5rem,10vw,6rem)]"
          : "text-[clamp(2rem,5vw,3.25rem)]",
        onDark ? "text-primary-foreground" : "text-foreground"
      )}
    >
      {label}
    </span>
  );
}

export function OrderList() {
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const { ordersRefreshKey } = useWebSocket();
  const [isGuest, setIsGuest] = useState(false);

  const fetchOrders = useCallback(async () => {
    const token = getAuthToken();
    setIsGuest(!token);
    try {
      const path = token
        ? "/api/orders"
        : `/api/orders/public?organization=${encodeURIComponent(
            process.env.NEXT_PUBLIC_ORG_NAME || "Default",
          )}`;
      const data = await apiFetch<ServerOrder[]>(path);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load orders";
      toast.error(message);
    }
  }, [setOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, ordersRefreshKey]);

  useEffect(() => {
    if (!isGuest) return;
    const interval = setInterval(fetchOrders, GUEST_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isGuest, fetchOrders]);

  const readyForPickup = orders.filter((o) => o.status === "ready");
  const preparingOrders = orders.filter(
    (o) =>
      o.status !== "ready" &&
      o.status !== "completed" &&
      o.status !== "cancelled",
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <section className="rounded-[26px] border border-line bg-surface p-6 sm:p-7">
        <h2 className="mb-5 text-2xl font-extrabold text-muted-foreground">
          Preparing
        </h2>
        <div className="flex flex-wrap gap-x-[22px] gap-y-4">
          {preparingOrders.map((order) => (
            <BoardLabel key={order.id} label={orderLabel(order)} />
          ))}
          {preparingOrders.length === 0 && (
            <p className="text-[15px] text-muted-foreground">
              Nothing in preparation.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[26px] bg-primary p-6 sm:p-7">
        <h2 className="mb-5 text-2xl font-extrabold text-primary-foreground/75">
          Ready to pick up
        </h2>
        <div className="flex flex-wrap gap-x-[22px] gap-y-4">
          {readyForPickup.map((order) => (
            <BoardLabel key={order.id} label={orderLabel(order)} onDark />
          ))}
          {readyForPickup.length === 0 && (
            <p className="text-[15px] text-primary-foreground/70">Nothing ready yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
