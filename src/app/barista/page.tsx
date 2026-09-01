"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { OrderQueue } from "@/components/barista/OrderQueue";
import { PageContainer } from "@/components/ui/page-container";

export default function BaristaPage() {
  return (
    <RoleRouteGuard mode="staff">
      <PageContainer className="py-5 sm:py-5">
        <OrderQueue />
      </PageContainer>
    </RoleRouteGuard>
  );
}
