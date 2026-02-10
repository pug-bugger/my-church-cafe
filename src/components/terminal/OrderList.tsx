"use client";

import { useAppStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebSocket } from "@/context/WebSocketContext";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

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
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {!isConnected && (
        <Alert variant="destructive">
          <AlertDescription>
            Not connected to server. Orders may not update in real-time.
          </AlertDescription>
        </Alert>
      )}

      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Order #{String(order.id).slice(0, 8)}</CardTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {item.product_item_name ?? "Item"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      × {item.quantity}
                    </span>
                  </div>
                  {item.price !== null && (
                    <span className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  )}
                </li>
              ))}
              {order.items.length === 0 && (
                <li className="text-sm text-muted-foreground">No items</li>
              )}
            </ul>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No orders yet
        </div>
      )}
    </div>
  );
}
