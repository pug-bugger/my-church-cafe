import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrinkList } from "@/components/terminal/DrinkList";
import { OrderList } from "@/components/terminal/OrderList";
import { CurrentOrder } from "@/components/terminal/CurrentOrder";

export default function TerminalPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Order Terminal</h1>

      <Tabs defaultValue="drinks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drinks">New Order</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="drinks">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DrinkList />
            </div>
            <div className="lg:col-span-1">
              <CurrentOrder />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <OrderList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
