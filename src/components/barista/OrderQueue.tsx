"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderStatus, ServerOrder, ServerOrderItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function OrderQueue() {
  const { isConnected, ordersRefreshKey } = useWebSocket();
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const removeOrderItem = useAppStore((state) => state.removeOrderItem);
  const removeOrder = useAppStore((state) => state.removeOrder);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

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

  const handleRemoveItem = async (orderId: number, item: ServerOrderItem) => {
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
      toast.error("Login required to remove order items.");
      return;
    }

    const key = `${orderId}-${item.id}`;
    setRemovingKey(key);
    try {
      const response = await fetch(
        `${apiUrl}/api/orders/${orderId}/items/${item.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove item");
      }
      removeOrderItem(orderId, item.id);
      if (data.status === "cancelled") {
        toast.success("Last item removed — order cancelled");
      } else {
        toast.success("Item removed");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove item";
      toast.error(message);
    } finally {
      setRemovingKey(null);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
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
      toast.error("Login required to delete orders.");
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete order");
      }
      removeOrder(orderId);
      toast.success("Order deleted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete order";
      toast.error(message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const OrderCard = ({ order }: { order: ServerOrder }) => (
    <Card key={order.id} className="mb-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="leading-tight">
          # {order.order_number ?? order.id}
        </CardTitle>
        {order.status === "pending" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full px-3 text-xs text-destructive hover:text-destructive"
            disabled={deletingOrderId === order.id}
            onClick={() => handleDeleteOrder(order.id)}
          >
            {deletingOrderId === order.id ? "Deleting…" : "Delete order"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {item.product_item_name ?? "Item"} × {item.quantity}
                </div>
                {(item.product_item_options?.length ?? 0) > 0 && (
                  <ul className="mt-1.5 text-sm text-muted-foreground space-y-0.5 list-none pl-0">
                    {(item.product_item_options ?? []).map((option) => (
                      <li key={option.id} className="flex flex-wrap gap-x-1">
                        <span className="font-medium text-foreground/80">
                          {option.option_definition_name ?? "Option"}
                        </span>
                        {option.option_value_name != null &&
                          String(option.option_value_name).length > 0 && (
                            <span>: {option.option_value_name}</span>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {order.status === "pending" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 shrink-0 rounded-full p-0 text-destructive"
                  aria-label={`Remove ${item.product_item_name ?? "item"}`}
                  disabled={removingKey === `${order.id}-${item.id}`}
                  onClick={() => handleRemoveItem(order.id, item)}
                >
                  -
                </Button>
              ) : null}
            </li>
          ))}
          {order.items.length === 0 && (
            <li className="text-sm text-muted-foreground">No items</li>
          )}
        </ul>

        {order.status === "pending" && (
          <Button
            className="w-full"
            disabled={deletingOrderId === order.id}
            onClick={() => handleStatusUpdate(order.id, "preparing")}
          >
            Start Preparing
          </Button>
        )}

        {order.status === "preparing" && (
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate(order.id, "pending")}
            >
              Back to Pending
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleStatusUpdate(order.id, "ready")}
            >
              Mark as Ready
            </Button>
          </div>
        )}

        {order.status === "ready" && (
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate(order.id, "preparing")}
            >
              Back to Preparing
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => handleStatusUpdate(order.id, "completed")}
            >
              Complete Order
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      {!isConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Login required to update order status.
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
