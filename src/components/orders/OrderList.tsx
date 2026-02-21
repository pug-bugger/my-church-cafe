"use client";

import { useAppStore } from "@/store";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebSocket } from "@/context/WebSocketContext";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { ServerOrder } from "@/types";

export function OrderList() {
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const { isConnected, ordersRefreshKey } = useWebSocket();

  const fetchOrders = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/orders/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load orders");
      }
      const data = await response.json();
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

  const readyForPickup = orders.filter((o) => o.status === "ready");

  const OrderNumberCup = ({ order }: { order: ServerOrder }) => (
    <div className="relative flex items-center justify-center w-[300px] h-[300px] shrink-0">
      <div
        className="absolute inset-0 z-0 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/cup.svg')" }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center pt-4 -mt-[50px] mr-[60px]">
        <span className="text-8xl font-black tracking-tighter text-foreground">
          {order.order_number ?? order.id}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {!isConnected && (
        <div className="text-center text-muted-foreground py-8">
          ⚠️
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No orders yet
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 screen-full">
          <div className="space-y-3 pt-6 md:pt-0 md:pl-6">
            <h2 className="text-6xl font-semibold font-serif text-center pb-4">
              👇 Ready to pick up 👇
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {readyForPickup.map((order) => (
                <OrderNumberCup key={order.id} order={order} />
              ))}
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
