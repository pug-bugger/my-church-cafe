import { DrinkManagement } from "@/components/admin/DrinkManagement";
import { OrdersReportSection } from "@/components/admin/OrdersReportSection";

export default function AdminPage() {
  return (
    <div className="container mx-auto py-6 space-y-10">
      <DrinkManagement />
      <OrdersReportSection />
    </div>
  );
}
