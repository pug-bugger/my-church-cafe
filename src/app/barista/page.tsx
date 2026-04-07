"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { OrderQueue } from "@/components/barista/OrderQueue";

export default function BaristaPage() {
  return (
    <RoleRouteGuard mode="staff">
      <div className="container mx-auto py-6">
        <OrderQueue />
      </div>
    </RoleRouteGuard>
  );
}
