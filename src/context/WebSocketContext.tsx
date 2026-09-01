"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { OrderStatus } from "@/types";
import { toast } from "sonner";
import { createSocket } from "@/app/_lib/socket";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { getAuthToken, AUTH_EVENT } from "@/lib/auth";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  ordersRefreshKey: number;
  /** Bumped whenever a product is created, edited, hidden, or deleted. */
  productsRefreshKey: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  ordersRefreshKey: 0,
  productsRefreshKey: 0,
});

export const useWebSocket = () => useContext(WebSocketContext);

type SocketReadyPayload = { userId: string; role: string };
type OrderCreatedPayload = {
  id: number;
  userId: number;
  total: number;
  status: OrderStatus;
};
type OrderStatusUpdatedPayload = {
  id: number;
  userId: number;
  status: OrderStatus;
};

const isOrderStatus = (status: unknown): status is OrderStatus =>
  status === "pending" ||
  status === "preparing" ||
  status === "ready" ||
  status === "completed" ||
  status === "paid" ||
  status === "cancelled";

const getStatusMessage = (status: OrderStatus, orderId: number) => {
  const shortId = String(orderId).slice(0, 8);
  switch (status) {
    case "preparing":
      return `Order #${shortId} is now being prepared`;
    case "ready":
      return `Order #${shortId} is ready for pickup!`;
    case "completed":
      return `Order #${shortId} has been completed`;
    default:
      return `Order #${shortId} status updated to ${status}`;
  }
};

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);
  const { playSound } = useNotificationSound();

  useEffect(() => {
    setToken(getAuthToken());

    const onStorage = (e: StorageEvent) => {
      if (!e.key || ["token", "jwt", "accessToken"].includes(e.key)) {
        setToken(getAuthToken());
      }
    };
    const onAuthToken = () => setToken(getAuthToken());
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EVENT, onAuthToken);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EVENT, onAuthToken);
    };
  }, []);

  useEffect(() => {
    // Backend requires JWT; don't attempt to connect without it.
    if (!token) {
      setIsConnected(false);
      setSocket(null);
      return;
    }

    const newSocket = createSocket(token);

    newSocket.on("connect", () => {
      setIsConnected(true);
      toast.success("Connected to server");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    newSocket.on("socket:ready", (payload: SocketReadyPayload) => {
      toast.success(`Socket ready (${payload.role})`);
    });

    newSocket.on("order:created", (payload: OrderCreatedPayload) => {
      // This app currently keeps full order items client-side; backend payload
      // doesn’t include items here, so we only notify.
      toast.message(`New order #${String(payload.id).slice(0, 8)} created`);
      setOrdersRefreshKey((prev) => prev + 1);
    });

    newSocket.on("order:updated", () => {
      setOrdersRefreshKey((prev) => prev + 1);
    });

    newSocket.on("order:deleted", () => {
      setOrdersRefreshKey((prev) => prev + 1);
    });

    newSocket.on("order:statusUpdated", (payload: OrderStatusUpdatedPayload) => {
      if (!isOrderStatus(payload.status)) return;
      setOrdersRefreshKey((prev) => prev + 1);

      const message = getStatusMessage(payload.status, payload.id);

      switch (payload.status) {
        case "ready":
          playSound();
          toast.success(message);
          break;
        case "preparing":
          toast.info(message);
          break;
        case "completed":
          toast.success(message);
          break;
        default:
          toast(message);
      }
    });

    // Menu changes are broadcast to everyone; screens showing the menu just
    // need to know something changed, not what.
    const bumpProducts = () => setProductsRefreshKey((prev) => prev + 1);
    newSocket.on("product:created", bumpProducts);
    newSocket.on("product:updated", bumpProducts);
    newSocket.on("product:deleted", bumpProducts);

    newSocket.on("connect_error", (err) => {
      setIsConnected(false);
      toast.error(`Socket error: ${err?.message ?? "connect_error"}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <WebSocketContext.Provider
      value={{ socket, isConnected, ordersRefreshKey, productsRefreshKey }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
