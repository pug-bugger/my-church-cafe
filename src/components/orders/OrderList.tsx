"use client";

import { useAppStore } from "@/store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/context/WebSocketContext";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ServerOrder } from "@/types";
import { Spinner } from "../ui/spinner";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

// Guests have no realtime socket connection (that requires a JWT), so the
// board polls instead while unauthenticated.
const GUEST_POLL_INTERVAL_MS = 10000;

export function OrderList() {
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const { isConnected, ordersRefreshKey } = useWebSocket();
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

  const getOrderLabel = (order: ServerOrder): string =>
    order.customer_name?.trim() || String(order.order_number ?? order.id);

  const isNumeric = (label: string) => /^\d+$/.test(label);

  const getLabelTracking = (label: string): string =>
    isNumeric(label) ? "tracking-tighter" : "tracking-wide";

  return (
    <div className="space-y-4">
      {!isGuest && !isConnected && (
        <div className="text-center text-muted-foreground py-8">
          <Spinner className="mx-auto" />
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No orders yet
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-3 pt-6 md:pt-0 md:pl-6">
            <h2 className="text-4xl font-semibold  text-center pb-4 tracking-tight">
              Preparing
            </h2>
            <div className="flex flex-wrap gap-8 justify-start">
              {preparingOrders.map((order) => {
                const label = getOrderLabel(order);
                return (
                  <Card
                    key={order.id}
                    className="h-36 w-fit flex items-center justify-center px-8"
                  >
                    <CardHeader className="p-0">
                      <CardTitle
                        className={`${isNumeric(label) ? "text-8xl" : "text-6xl"} ${getLabelTracking(label)} font-black text-foreground whitespace-nowrap`}
                      >
                        {label}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
              {preparingOrders.length === 0 && (
                <p className="text-muted-foreground text-center py-6">
                  No orders ready for pickup
                </p>
              )}
            </div>
          </div>
          <div className="space-y-3 pt-6 md:pt-0 md:pl-6">
            <h2 className="text-4xl font-semibold  text-center pb-4 tracking-tight">
              Ready to pick up
            </h2>
            <div className="flex flex-wrap gap-5 justify-start">
              {readyForPickup.map((order) => {
                const label = getOrderLabel(order);
                return (
                  <Card
                    key={order.id}
                    className="h-36 w-fit flex items-center justify-center px-8"
                  >
                    <CardHeader className="p-0">
                      <CardTitle
                        className={`${isNumeric(label) ? "text-8xl" : "text-4xl"} ${getLabelTracking(label)} font-black text-foreground whitespace-nowrap`}
                      >
                        {label}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
              {readyForPickup.length === 0 && (
                <p className="text-muted-foreground text-center py-6">
                  No orders ready for pickup
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
