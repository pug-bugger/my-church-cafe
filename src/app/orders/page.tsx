import { OrderList } from "@/components/terminal/OrderList";

export default function OrdersPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>
      <OrderList />
    </div>
  );
}
