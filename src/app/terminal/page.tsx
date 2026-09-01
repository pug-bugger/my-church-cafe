"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { DrinkList } from "@/components/terminal/DrinkList";
import { DessertList } from "@/components/terminal/DessertList";
import { CurrentOrder } from "@/components/terminal/CurrentOrder";
import { PageContainer } from "@/components/ui/page-container";

export default function TerminalPage() {
  return (
    <RoleRouteGuard mode="staff">
      <PageContainer>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Drinks</h2>
              <DrinkList />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Desserts</h2>
              <DessertList />
            </section>
          </div>
          {/* Order panel: below the lists on phones/tablets, pinned beside them on desktop. */}
          <div className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
            <CurrentOrder />
          </div>
        </div>
      </PageContainer>
    </RoleRouteGuard>
  );
}
