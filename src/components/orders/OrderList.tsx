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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const pendingAndInProgress = orders.filter(
    (o) => o.status === "pending" || o.status === "preparing"
  );
  const readyForPickup = orders.filter((o) => o.status === "ready");

  const OrderCard = ({ order }: { order: ServerOrder }) => (
    <Card className="relative w-auto shrink-0">
      <span
        className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(
          order.status
        )}`}
        title={order.status}
        aria-label={order.status}
      />
      <CardHeader className="py-3 px-6">
        <CardTitle className="text-8xl">
          {order.order_number ?? order.id}
        </CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    <div className="space-y-4">
      {!isConnected && (
        <Alert variant="destructive">
          <AlertDescription>
            Not connected to server. Orders may not update in real-time.
          </AlertDescription>
        </Alert>
      )}

      {orders.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No orders yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 screen-full">
          <div className="space-y-3 pb-6 border-b border-border md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <h2 className="text-lg font-semibold">
              Pending & In Progress
            </h2>
            <div className="flex flex-wrap gap-3 justify-start">
              {pendingAndInProgress.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {pendingAndInProgress.length === 0 && (
                <p className="text-muted-foreground text-center py-6">
                  No orders pending or in progress
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-6 md:pt-0 md:pl-6">
            <h2 className="text-lg font-semibold">
              Ready for Pickup
            </h2>
            <div className="flex flex-wrap gap-3 justify-start">
              {readyForPickup.map((order) => (
                <OrderCard key={order.id} order={order} />
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
