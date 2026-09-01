import { OrderList } from "@/components/orders/OrderList";
import { PageContainer } from "@/components/ui/page-container";

export default function OrdersPage() {
  return (
    <PageContainer fullWidth>
      <OrderList />
    </PageContainer>
  );
}
