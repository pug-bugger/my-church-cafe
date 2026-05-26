"use client";

import { RoleRouteGuard } from "@/components/RoleRouteGuard";
import { DrinkList } from "@/components/terminal/DrinkList";
import { DessertList } from "@/components/terminal/DessertList";
import { CurrentOrder } from "@/components/terminal/CurrentOrder";

export default function TerminalPage() {
  return (
    <RoleRouteGuard mode="staff">
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Drinks</h2>
              <DrinkList />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Desserts</h2>
              <DessertList />
            </section>
          </div>
          <div className="lg:col-span-1">
            <CurrentOrder />
          </div>
        </div>
      </div>
    </RoleRouteGuard>
  );
}
