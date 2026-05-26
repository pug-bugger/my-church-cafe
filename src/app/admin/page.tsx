"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { AddProductDialog } from "@/components/admin/AddProductDialog";
import { DrinkManagement } from "@/components/admin/DrinkManagement";
import { DessertManagement } from "@/components/admin/DessertManagement";
import { OrdersReportSection } from "@/components/admin/OrdersReportSection";
import { UserManagement } from "@/components/admin/UserManagement";

export default function AdminPage() {
  return (
    <RoleRouteGuard mode="admin">
      <div className="container mx-auto py-6 space-y-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Menu</h1>
            <p className="text-sm text-muted-foreground">
              Add drinks, desserts, or meals from one form.
            </p>
          </div>
          <AddProductDialog />
        </div>
        <DrinkManagement />
        <DessertManagement />
        <UserManagement />
        <OrdersReportSection />
      </div>
    </RoleRouteGuard>
  );
}
