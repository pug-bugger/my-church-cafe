"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OrderStatus, ServerOrder, ServerOrderItem } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation, type TranslateFn } from "@/i18n";
import { getAuthToken } from "@/lib/auth";
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
  busy: boolean;
  onAdvance: () => void;
  onDelete?: () => void;
  onRemoveItem?: (item: ServerOrderItem) => void;
  removingKey: string | null;
  t: TranslateFn;
};

function OrderCard({
  order,
  busy,
  onAdvance,
  onDelete,
  onRemoveItem,
  removingKey,
  t,
}: OrderCardProps) {
  const items = drinkItems(order);
  return (
    <article className="enter rounded-card border border-line bg-surface p-[18px] shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[21px] font-extrabold tracking-[-0.015em]">
          {orderTitle(order)}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
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
                  {item.product_item_name ?? t("orders.queue.itemFallback")}{" "}
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
                  aria-label={t("orders.queue.removeNamed", {
                    name:
                      item.product_item_name ?? t("orders.queue.itemFallback"),
                  })}
                  title={t("orders.queue.removeItemTooltip")}
                  className="press flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-muted-foreground hover:bg-ink/5 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">
            {t("orders.queue.noItems")}
          </li>
        )}
      </ul>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className="press min-h-[52px] flex-1 rounded-ctl bg-primary text-base font-bold text-primary-foreground hover:bg-ac-dark disabled:pointer-events-none disabled:bg-ac-mid"
        >
          {t("orders.queue.readyForPickup")}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label={t("orders.queue.cancelOrder")}
            title={t("orders.queue.cancelOrder")}
            className="press flex min-h-[52px] w-[52px] flex-none items-center justify-center rounded-ctl border border-line bg-surface text-muted-foreground hover:bg-ink/5 disabled:opacity-50"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ColumnHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <span className="num rounded-full border border-line bg-surface px-2.5 py-[3px] text-[13px] font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export function OrderQueue() {
  const { t } = useTranslation();
  const { isConnected, ordersRefreshKey } = useWebSocket();
  const orders = useAppStore((state) => state.orders);
  const setOrders = useAppStore((state) => state.setOrders);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const removeOrderItem = useAppStore((state) => state.removeOrderItem);
  const removeOrder = useAppStore((state) => state.removeOrder);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  // Deleting an order, or taking a line off one, is not undoable and the
  // buttons sit next to the ones a barista hits all shift — both ask first.
  const [orderToDelete, setOrderToDelete] = useState<ServerOrder | null>(null);
  const [itemToRemove, setItemToRemove] = useState<{
    orderId: number;
    item: ServerOrderItem;
  } | null>(null);
  const [, setAgeTick] = useState(0);

  // One step: an order waits here until it is handed to the shelf or removed.
  // `preparing` is no longer produced, but orders that were mid-flight when this
  // shipped still carry it — fold them in so they aren't stranded invisible.
  const queueOrders = orders.filter(
    (order) => order.status === "pending" || order.status === "preparing"
  );
  const readyOrders = orders.filter((order) => order.status === "ready");

  const fetchOrders = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const data = await apiFetch<ServerOrder[]>("/api/orders", { auth: true });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.loadOrders");
      toast.error(message);
    }
  }, [setOrders, t]);

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
        authError: t("errors.loginRequiredForStatus"),
      });
      updateOrderStatus(orderId, status);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.updateStatus");
      toast.error(message);
    }
  };

  const handleRemoveItem = async (orderId: number, item: ServerOrderItem) => {
    const key = `${orderId}-${item.id}`;
    setRemovingKey(key);
    setItemToRemove(null);
    try {
      const data = await apiFetch<{ status?: string }>(
        `/api/orders/${orderId}/items/${item.id}`,
        {
          method: "DELETE",
          auth: true,
          authError: t("errors.loginRequiredToRemoveItems"),
        }
      );
      removeOrderItem(orderId, item.id);
      if (data?.status === "cancelled") {
        toast.success(t("orders.toast.lastItemRemoved"));
      } else {
        toast.success(t("orders.toast.itemRemoved"));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.removeItem");
      toast.error(message);
    } finally {
      setRemovingKey(null);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    setDeletingOrderId(orderId);
    setOrderToDelete(null);
    try {
      await apiFetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        auth: true,
        authError: t("errors.loginRequiredToDeleteOrders"),
      });
      removeOrder(orderId);
      toast.success(t("orders.toast.orderDeleted"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.deleteOrder");
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
            {t("errors.loginRequiredForStatus")}
          </AlertDescription>
        </Alert>
      )}

      <section>
        <ColumnHeading
          title={t("orders.queue.inQueue")}
          count={queueOrders.length}
        />
        {/* One column on a phone, two once there is width — the queue owns the
            full page now that "preparing" no longer takes half of it. */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {queueOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={deletingOrderId === order.id}
              removingKey={removingKey}
              onAdvance={() => handleStatusUpdate(order.id, "ready")}
              // The server only allows deleting a `pending` order, so a legacy
              // `preparing` one is advanced or emptied item by item, not removed.
              onDelete={
                order.status === "pending"
                  ? () => setOrderToDelete(order)
                  : undefined
              }
              onRemoveItem={(item) =>
                setItemToRemove({ orderId: order.id, item })
              }
              t={t}
            />
          ))}
          {queueOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("orders.queue.nothingWaiting")}
            </p>
          )}
        </div>
      </section>

      {/* Handover shelf: tap a name to complete the order. */}
      <div className="rounded-card border border-line bg-surface px-[18px] py-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-[13px] font-semibold text-muted-foreground">
            {t("orders.queue.readyAwaitingPickup")}
          </span>
          {readyOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleStatusUpdate(order.id, "completed")}
              title={t("orders.queue.handoverTooltip")}
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
              {t("orders.queue.nothingOnCounter")}
            </span>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("orders.queue.deleteOrderTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.queue.deleteOrderBody", {
                name: orderToDelete ? orderTitle(orderToDelete) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingOrderId === orderToDelete?.id}
              onClick={() =>
                orderToDelete && handleDeleteOrder(orderToDelete.id)
              }
            >
              {t("orders.queue.cancelOrder")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!itemToRemove}
        onOpenChange={(open) => !open && setItemToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("orders.queue.removeItemTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.queue.removeItemBody", {
                name:
                  itemToRemove?.item.product_item_name ??
                  t("orders.queue.itemFallback"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                itemToRemove &&
                handleRemoveItem(itemToRemove.orderId, itemToRemove.item)
              }
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
