"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { ProductPicker } from "@/components/terminal/ProductPicker";
import { CurrentOrder } from "@/components/terminal/CurrentOrder";
import { PageContainer } from "@/components/ui/page-container";

export default function TerminalPage() {
  return (
    <RoleRouteGuard mode="staff">
      <PageContainer className="py-5 sm:py-5">
        {/* Picker left, running order right — stacked below lg so the panel
            stays reachable on a phone. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
          <section>
            <ProductPicker />
          </section>
          <div className="lg:sticky lg:top-[88px]">
            <CurrentOrder />
          </div>
        </div>
      </PageContainer>
    </RoleRouteGuard>
  );
}
