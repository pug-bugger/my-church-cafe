"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OrdersDataTable } from "@/components/orders/OrdersDataTable";
import type { ServerOrder } from "@/types";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

export function OrdersReportSection() {
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!getAuthToken()) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ServerOrder[]>("/api/orders", { auth: true });
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
