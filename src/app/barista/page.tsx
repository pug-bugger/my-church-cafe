"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { OrderQueue } from "@/components/barista/OrderQueue";
import { PageContainer } from "@/components/ui/page-container";

export default function BaristaPage() {
  return (
    <RoleRouteGuard mode="staff">
      <PageContainer>
        <OrderQueue />
      </PageContainer>
    </RoleRouteGuard>
  );
}
