"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { ManageTabs } from "@/components/admin/ManageTabs";
import { PageContainer } from "@/components/ui/page-container";

export default function AdminPage() {
  return (
    <RoleRouteGuard mode="admin">
      <PageContainer className="py-5 sm:py-5">
        <ManageTabs />
      </PageContainer>
    </RoleRouteGuard>
  );
}
