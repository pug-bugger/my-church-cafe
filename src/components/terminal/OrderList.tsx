"use client";

import { useAppStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWebSocket } from "@/context/WebSocketContext";

export function OrderList() {
  const orders = useAppStore((state) => state.orders);
  const drinks = useAppStore((state) => state.drinks);
  const { isConnected } = useWebSocket();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDrinkById = (id: string) => {
    return drinks.find((drink) => drink.id === id);
  };

  return (
    <div className="space-y-4">
      {!isConnected && (
        <Alert variant="destructive">
          <AlertDescription>
            Not connected to server. Orders may not update in real-time.
          </AlertDescription>
        </Alert>
      )}

      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {order.items.map((item) => {
                const drink = getDrinkById(item.drinkId);
                if (!drink) return null;

                return (
                  <li
                    key={item.id}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium">{drink.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        × {item.quantity}
                      </span>
                      <ul className="text-sm text-muted-foreground">
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
                    </div>
                    <span className="font-medium">
                      ${(drink.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No orders yet
        </div>
      )}
    </div>
  );
}
