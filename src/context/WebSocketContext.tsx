"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAppStore } from "@/store";
import { Order } from "@/types";
import { toast } from "sonner";
import { createSocket } from "@/app/_lib/socket";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

type SocketReadyPayload = { userId: string; role: string };
type OrderCreatedPayload = {
  id: string;
  userId: string;
  total: number;
  status: string;
};
type OrderStatusUpdatedPayload = { id: string; userId: string; status: string };

const isOrderStatus = (status: unknown): status is Order["status"] =>
  status === "pending" ||
  status === "preparing" ||
  status === "ready" ||
  status === "completed";

const getStatusMessage = (status: Order["status"], orderId: string) => {
  switch (status) {
    case "preparing":
      return `Order #${orderId.slice(0, 8)} is now being prepared`;
    case "ready":
      return `Order #${orderId.slice(0, 8)} is ready for pickup!`;
    case "completed":
      return `Order #${orderId.slice(0, 8)} has been completed`;
    default:
      return `Order #${orderId.slice(0, 8)} status updated to ${status}`;
  }
};

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const readToken = () =>
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");

    setToken(readToken());

    const onStorage = (e: StorageEvent) => {
      if (!e.key || ["token", "jwt", "accessToken"].includes(e.key)) {
        setToken(readToken());
      }
    };
    const onAuthToken = () => setToken(readToken());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:token", onAuthToken);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:token", onAuthToken);
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
      toast.message(`New order #${payload.id.slice(0, 8)} created`);
    });

    newSocket.on("order:statusUpdated", (payload: OrderStatusUpdatedPayload) => {
      if (!isOrderStatus(payload.status)) return;

      updateOrderStatus(payload.id, payload.status);

      const message = getStatusMessage(payload.status, payload.id);

      switch (payload.status) {
        case "ready":
          toast.success(message, {
            duration: Infinity,
          });
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

    newSocket.on("connect_error", (err) => {
      setIsConnected(false);
      toast.error(`Socket error: ${err?.message ?? "connect_error"}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, updateOrderStatus]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
