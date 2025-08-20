import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrinkList } from "@/components/terminal/DrinkList";
import { OrderList } from "@/components/terminal/OrderList";

export default function TerminalPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Order Terminal</h1>

      <Tabs defaultValue="drinks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drinks">Available Drinks</TabsTrigger>
          <TabsTrigger value="orders">Current Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="drinks">
          <DrinkList />
        </TabsContent>

        <TabsContent value="orders">
          <OrderList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
