"use client";

import { useAppStore } from "@/store";
import { useWebSocket } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Order } from "@/types";

export function OrderQueue() {
  const { socket, isConnected } = useWebSocket();
  const orders = useAppStore((state) => state.orders);
  const drinks = useAppStore((state) => state.drinks);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const preparingOrders = orders.filter(
    (order) => order.status === "preparing"
  );
  const readyOrders = orders.filter((order) => order.status === "ready");

  const handleStatusUpdate = (orderId: string, status: Order["status"]) => {
    if (socket) {
      socket.emit("updateOrderStatus", { orderId, status });
    }
    updateOrderStatus(orderId, status);
  };

  const getDrinkById = (id: string) => {
    return drinks.find((drink) => drink.id === id);
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card key={order.id} className="mb-4">
      <CardHeader>
        <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {order.items.map((item) => {
            const drink = getDrinkById(item.drinkId);
            if (!drink) return null;

            return (
              <li key={item.id}>
                <div className="font-medium">
                  {drink.name} × {item.quantity}
                </div>
                <ul className="text-sm text-muted-foreground ml-4">
                  {Object.entries(item.selectedOptions).map(
                    ([optionId, value]) => {
                      const option = drink.availableOptions.find(
                        (opt) => opt.id === optionId
                      );
                      return option ? (
                        <li key={optionId}>
                          {option.name}: {value}
                        </li>
                      ) : null;
                    }
                  )}
                </ul>
              </li>
            );
          })}
        </ul>

        {order.status === "pending" && (
          <Button
            className="w-full"
            onClick={() => handleStatusUpdate(order.id, "preparing")}
          >
            Start Preparing
          </Button>
        )}

        {order.status === "preparing" && (
          <Button
            className="w-full"
            onClick={() => handleStatusUpdate(order.id, "ready")}
          >
            Mark as Ready
          </Button>
        )}

        {order.status === "ready" && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => handleStatusUpdate(order.id, "completed")}
          >
            Complete Order
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      {!isConnected && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Not connected to server. Order updates may not sync in real-time.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending Orders</h2>
          {pendingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {pendingOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No pending orders
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">In Progress</h2>
          {preparingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {preparingOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No orders in progress
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Ready for Pickup</h2>
          {readyOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {readyOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No orders ready
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
