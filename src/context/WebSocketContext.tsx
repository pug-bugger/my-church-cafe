"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppStore } from "@/store";
import { Order } from "@/types";
import { toast } from "sonner";
import { getWebSocketUrl } from "@/utils/network";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

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

  useEffect(() => {
    const newSocket = io(getWebSocketUrl(), {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      toast.success("Connected to server");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    newSocket.on(
      "orderStatusUpdated",
      (data: { orderId: string; status: Order["status"] }) => {
        updateOrderStatus(data.orderId, data.status);

        const message = getStatusMessage(data.status, data.orderId);

        switch (data.status) {
          case "ready":
            toast.success(message, {
              duration: Infinity,
              onDismiss: () => {
                // Dismiss the toast when the order is picked up
              },
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
      }
    );

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [updateOrderStatus]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
