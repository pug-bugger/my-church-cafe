import { OrderQueue } from "@/components/barista/OrderQueue";

export default function BaristaPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Barista Station</h1>
      <OrderQueue />
    </div>
  );
}
