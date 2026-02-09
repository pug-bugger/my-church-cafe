"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrderStatus } from "@/types";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

export function OrderQueue() {
  const { isConnected, ordersRefreshKey } = useWebSocket();
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const preparingOrders = orders.filter(
    (order) => order.status === "preparing"
  );
  const readyOrders = orders.filter((order) => order.status === "ready");

  const fetchOrders = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
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

  const handleStatusUpdate = async (
    orderId: number,
    status: OrderStatus
  ) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      toast.error("Missing NEXT_PUBLIC_API_URL in your environment.");
      return;
    }
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Login required to update order status.");
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update order status");
      }
      updateOrderStatus(orderId, status);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update order status";
      toast.error(message);
    }
  };

  const OrderCard = ({
    order,
  }: {
    order: {
      id: number;
      status: OrderStatus;
      items: {
        id: number;
        product_item_name: string | null;
        quantity: number;
      }[];
    };
  }) => (
    <Card key={order.id} className="mb-4">
      <CardHeader>
        <CardTitle>Order #{String(order.id).slice(0, 8)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {order.items.map((item) => (
            <li key={item.id}>
              <div className="font-medium">
                {item.product_item_name ?? "Item"} × {item.quantity}
              </div>
            </li>
          ))}
          {order.items.length === 0 && (
            <li className="text-sm text-muted-foreground">No items</li>
          )}
        </ul>

        {order.status === "pending" && (
          <Button
            className="w-full"
            onClick={() => handleStatusUpdate(order.id, "preparing")}
          >
            Start Preparing
          </Button>
        )}

        {order.status === "preparing" && (
          <Button
            className="w-full"
            onClick={() => handleStatusUpdate(order.id, "ready")}
          >
            Mark as Ready
          </Button>
        )}

        {order.status === "ready" && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => handleStatusUpdate(order.id, "completed")}
          >
            Complete Order
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      {!isConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Not connected to server. Order updates may not sync in real-time.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Orders</h2>
          {pendingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {pendingOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No pending orders
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">In Progress</h2>
          {preparingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {preparingOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No orders in progress
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Ready for Pickup</h2>
          {readyOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {readyOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No orders ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
