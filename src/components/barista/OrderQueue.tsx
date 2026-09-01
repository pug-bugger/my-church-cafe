"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderStatus, ServerOrder, ServerOrderItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

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
    if (!getAuthToken()) return;
    try {
      const data = await apiFetch<ServerOrder[]>("/api/orders", { auth: true });
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
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: { status },
        auth: true,
        authError: "Login required to update order status.",
      });
      updateOrderStatus(orderId, status);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update order status";
      toast.error(message);
    }
  };

  const handleRemoveItem = async (orderId: number, item: ServerOrderItem) => {
    const key = `${orderId}-${item.id}`;
    setRemovingKey(key);
    try {
      const data = await apiFetch<{ status?: string }>(
        `/api/orders/${orderId}/items/${item.id}`,
        {
          method: "DELETE",
          auth: true,
          authError: "Login required to remove order items.",
        }
      );
      removeOrderItem(orderId, item.id);
      if (data?.status === "cancelled") {
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
    setDeletingOrderId(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        auth: true,
        authError: "Login required to delete orders.",
      });
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
          {order.customer_name
            ? order.customer_name
            : `# ${order.order_number ?? order.id}`}
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
        {order.comment && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {order.comment}
          </p>
        )}
        <ul className="space-y-2 mb-4">
          {order.items.filter((item) => item.category_name !== "Dessert").map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {item.product_item_name ?? "Item"} × {item.quantity}
                </div>
                <ul className="mt-1.5 text-sm text-muted-foreground space-y-0.5 list-none pl-0">
                  {(item.product_item_options ?? [])
                    .filter(
                      (opt) =>
                        opt.option_value_name != null &&
                        opt.option_value_name !== "" &&
                        opt.option_value_name !== "false",
                    )
                    .map((option) => (
                      <li key={option.id} className="flex flex-wrap gap-x-1">
                        <span className="font-medium text-foreground/80">
                          {option.option_definition_name ?? "Option"}
                        </span>
                        <span>: {option.option_value_name}</span>
                      </li>
                    ))}
                </ul>
                {item.comment && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {item.comment}
                  </p>
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
          {order.items.filter((item) => item.category_name !== "Dessert").length === 0 && (
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
