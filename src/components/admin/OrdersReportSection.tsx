"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OrdersDataTable } from "@/components/orders/OrdersDataTable";
import type { ServerOrder } from "@/types";

export function OrdersReportSection() {
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setLoading(false);
      return;
    }
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
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
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return (
    <OrdersDataTable
      orders={orders}
      loading={loading}
      showUserColumns
      title="All orders"
      description="Line items from every customer. Default range is the last 30 days; adjust dates, sort, group, then export."
    />
  );
}
