"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OrdersDataTable } from "@/components/orders/OrdersDataTable";
import type { ServerOrder } from "@/types";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/i18n";
import { getAuthToken } from "@/lib/auth";

export function OrdersReportSection() {
  const { t } = useTranslation();
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
        err instanceof Error ? err.message : t("errors.loadOrders");
      toast.error(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return (
    <OrdersDataTable
      orders={orders}
      loading={loading}
      showUserColumns
      title={t("manage.report.allOrders")}
      description={t("manage.report.allOrdersDescription")}
    />
  );
}
