"use client";

import { useAppStore } from "@/store";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CurrentOrder() {
  const draftItems = useAppStore((state) => state.draftItems);
  const drinks = useAppStore((state) => state.drinks);
  const removeDraftItem = useAppStore((state) => state.removeDraftItem);
  const clearDraft = useAppStore((state) => state.clearDraft);
  const confirmDraftOrder = useAppStore((state) => state.confirmDraftOrder);

  const getDrinkById = (id: string) => drinks.find((d) => d.id === id);

  const total = draftItems.reduce((sum, item) => {
    const drink = getDrinkById(item.drinkId);
    return sum + (drink ? drink.price * item.quantity : 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Order</CardTitle>
      </CardHeader>
      <CardContent>
        {draftItems.length === 0 ? (
          <Alert>
            <AlertDescription>
              No items added yet. Select a drink to begin.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-3">
            {draftItems.map((item) => {
              const drink = getDrinkById(item.drinkId);
              if (!drink) return null;
              return (
                <li key={item.id} className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {drink.name}
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        × {item.quantity}
                      </span>
                    </div>
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
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      ${(drink.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDraftItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="font-semibold">Total: ${total.toFixed(2)}</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearDraft}
            disabled={draftItems.length === 0}
          >
            Clear
          </Button>
          <Button
            onClick={confirmDraftOrder}
            disabled={draftItems.length === 0}
          >
            Confirm Order
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
