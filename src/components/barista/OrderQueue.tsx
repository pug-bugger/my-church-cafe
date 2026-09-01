"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderStatus, ServerOrder, ServerOrderItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { relativeAge } from "@/lib/format";
import { describeServerOptions } from "@/lib/drinkOptions";

/** Ages are rendered as "7 min"; re-render occasionally so they stay honest. */
const AGE_TICK_MS = 20000;

function orderTitle(order: ServerOrder): string {
  const name = order.customer_name?.trim();
  return name || `#${order.order_number ?? order.id}`;
}

/** Desserts are handed over from the counter, not made on the bar. */
function drinkItems(order: ServerOrder): ServerOrderItem[] {
  return order.items.filter((item) => item.category_name !== "Dessert");
}

type OrderCardProps = {
  order: ServerOrder;
  /** `preparing` cards get the accent edge; queue cards stay neutral. */
  tone: "queue" | "preparing";
  busy: boolean;
  onAdvance: () => void;
  onBack?: () => void;
  onDelete?: () => void;
  onRemoveItem?: (item: ServerOrderItem) => void;
  removingKey: string | null;
};

function OrderCard({
  order,
  tone,
  busy,
  onAdvance,
  onBack,
  onDelete,
  onRemoveItem,
  removingKey,
}: OrderCardProps) {
  const items = drinkItems(order);
  return (
    <article
      className={cn(
        "enter rounded-card border bg-surface p-[18px] shadow-card",
        tone === "preparing" ? "border-ac-mid" : "border-line"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[21px] font-extrabold tracking-[-0.015em]">
          {orderTitle(order)}
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            tone === "preparing" ? "text-primary" : "text-muted-foreground"
          )}
        >
          {relativeAge(order.created_at)}
        </span>
      </div>

      {order.comment ? (
        <p className="mb-3 rounded-xl bg-warn-soft px-3 py-2.5 text-[13px] font-semibold text-warn">
          {order.comment}
        </p>
      ) : null}

      <ul className="mb-4 flex flex-col gap-2.5">
        {items.map((item) => {
          const summary = describeServerOptions(item.product_item_options);
          const detail = [summary, item.comment].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold">
                  {item.product_item_name ?? "Item"}{" "}
                  <span className="num text-primary">×{item.quantity}</span>
                </div>
                {detail ? (
                  <div className="text-[13px] text-muted-foreground">
                    {detail}
                  </div>
                ) : null}
              </div>
              {onRemoveItem ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item)}
                  disabled={removingKey === `${order.id}-${item.id}`}
                  aria-label={`Remove ${item.product_item_name ?? "item"}`}
                  title="Remove this item from the order"
                  className="press flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-muted-foreground hover:bg-ink/5 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No items</li>
        )}
      </ul>

      <div className="flex gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Put back in the queue"
            title="Put back in the queue"
            className="press flex min-h-[52px] w-[52px] flex-none items-center justify-center rounded-ctl border border-line bg-surface text-muted-foreground hover:bg-ink/5"
          >
            <RotateCcw className="h-[18px] w-[18px]" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className="press min-h-[52px] flex-1 rounded-ctl bg-primary text-base font-bold text-primary-foreground hover:bg-ac-dark disabled:pointer-events-none disabled:bg-ac-mid"
        >
          {tone === "queue" ? "Start preparing" : "Ready for pickup"}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label="Cancel this order"
            title="Cancel this order"
            className="press flex min-h-[52px] w-[52px] flex-none items-center justify-center rounded-ctl border border-line bg-surface text-muted-foreground hover:bg-ink/5 disabled:opacity-50"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ColumnHeading({
  title,
  count,
  tone,
}: {
  title: string;
  count: number;
  tone: "queue" | "preparing";
}) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <span
        className={cn(
          "num rounded-full px-2.5 py-[3px] text-[13px] font-semibold",
          tone === "preparing"
            ? "bg-ac-soft text-ac-dark"
            : "border border-line bg-surface text-muted-foreground"
        )}
      >
        {count}
      </span>
    </div>
  );
}

export function OrderQueue() {
  const { isConnected, ordersRefreshKey } = useWebSocket();
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const removeOrderItem = useAppStore((state) => state.removeOrderItem);
  const removeOrder = useAppStore((state) => state.removeOrder);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [, setAgeTick] = useState(0);

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const preparingOrders = orders.filter((order) => order.status === "preparing");
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

  useEffect(() => {
    const timer = setInterval(() => setAgeTick((t) => t + 1), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
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

  return (
    <div className="flex flex-col gap-5">
      {!isConnected && (
        <Alert variant="destructive">
          <AlertDescription>
            Login required to update order status.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section>
          <ColumnHeading
            title="In queue"
            count={pendingOrders.length}
            tone="queue"
          />
          <div className="flex flex-col gap-3.5">
            {pendingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                tone="queue"
                busy={deletingOrderId === order.id}
                removingKey={removingKey}
                onAdvance={() => handleStatusUpdate(order.id, "preparing")}
                onDelete={() => handleDeleteOrder(order.id)}
                onRemoveItem={(item) => handleRemoveItem(order.id, item)}
              />
            ))}
            {pendingOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing waiting. New orders slide in here.
              </p>
            )}
          </div>
        </section>

        <section>
          <ColumnHeading
            title="Preparing"
            count={preparingOrders.length}
            tone="preparing"
          />
          <div className="flex flex-col gap-3.5">
            {preparingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                tone="preparing"
                busy={false}
                removingKey={removingKey}
                onAdvance={() => handleStatusUpdate(order.id, "ready")}
                onBack={() => handleStatusUpdate(order.id, "pending")}
              />
            ))}
            {preparingOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing on the bar right now.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Handover shelf: tap a name to complete the order. */}
      <div className="rounded-card border border-line bg-surface px-[18px] py-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-[13px] font-semibold text-muted-foreground">
            Ready · awaiting pickup
          </span>
          {readyOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleStatusUpdate(order.id, "completed")}
              title="Tap when handed over — completes the order"
              className="press enter flex min-h-[54px] items-center gap-2.5 rounded-full border border-ac bg-ac-soft px-5 text-[19px] font-extrabold text-ac-dark hover:bg-ac-mid/40"
            >
              {orderTitle(order)}
              <span className="text-xs font-semibold opacity-70">
                {relativeAge(order.created_at)}
              </span>
            </button>
          ))}
          {readyOrders.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Nothing waiting on the counter.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
