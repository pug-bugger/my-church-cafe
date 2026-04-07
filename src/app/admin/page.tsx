"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { DrinkManagement } from "@/components/admin/DrinkManagement";
import { OrdersReportSection } from "@/components/admin/OrdersReportSection";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminPage() {
  return (
    <RoleRouteGuard mode="admin">
      <div className="container mx-auto py-6 space-y-10">
        <DrinkManagement />
        <UserManagement />
        <OrdersReportSection />
      </div>
    </RoleRouteGuard>
  );
}
