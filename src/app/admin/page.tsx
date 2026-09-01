"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { AddProductDialog } from "@/components/admin/AddProductDialog";
import { DrinkManagement } from "@/components/admin/DrinkManagement";
import { DessertManagement } from "@/components/admin/DessertManagement";
import { OrdersReportSection } from "@/components/admin/OrdersReportSection";
import { UserManagement } from "@/components/admin/UserManagement";
import { PageContainer } from "@/components/ui/page-container";

export default function AdminPage() {
  return (
    <RoleRouteGuard mode="admin">
      <PageContainer className="space-y-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Menu</h1>
            <p className="text-sm text-muted-foreground">
              Manage drinks, desserts, or meals.
            </p>
          </div>
          <AddProductDialog />
        </div>
        <DrinkManagement />
        <DessertManagement />
        <UserManagement />
        <OrdersReportSection />
      </PageContainer>
    </RoleRouteGuard>
  );
}
