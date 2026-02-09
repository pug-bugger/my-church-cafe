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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function CurrentOrder() {
  const draftItems = useAppStore((state) => state.draftItems);
  const drinks = useAppStore((state) => state.drinks);
  const removeDraftItem = useAppStore((state) => state.removeDraftItem);
  const clearDraft = useAppStore((state) => state.clearDraft);
  const [productItems, setProductItems] = useState<
    { id: number; name: string | null }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const getDrinkById = (id: string) => drinks.find((d) => d.id === id);

  const total = draftItems.reduce((sum, item) => {
    const drink = getDrinkById(item.drinkId);
    return sum + (drink ? drink.price * item.quantity : 0);
  }, 0);

  useEffect(() => {
    if (!apiUrl) return;
    let isActive = true;
    const loadProductItems = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products/items`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load product items");
        }
        const data = await response.json();
        if (isActive) {
          setProductItems(
            Array.isArray(data)
              ? data.map((item) => ({ id: item.id, name: item.name }))
              : []
          );
        }
      } catch (_err) {
        if (isActive) {
          setProductItems([]);
        }
      }
    };
    loadProductItems();
    return () => {
      isActive = false;
    };
  }, [apiUrl]);

  const resolveProductItemId = (drinkId: string) => {
    const drink = getDrinkById(drinkId);
    if (!drink) return null;
    const normalized = (value?: string) =>
      (value || "").trim().toLowerCase();
    const byId =
      Number.isFinite(Number(drink.id)) &&
      productItems.find((item) => item.id === Number(drink.id));
    if (byId) return byId.id;
    const byName = productItems.find(
      (item) =>
        normalized(item.name ?? "") === normalized(drink.name) ||
        normalized(item.name ?? "") === normalized(drink.secondaryName)
    );
    return byName?.id ?? null;
  };

  const handleConfirmOrder = async () => {
    if (draftItems.length === 0) return;
    if (!apiUrl) {
      toast.error("Missing NEXT_PUBLIC_API_URL in your environment.");
      return;
    }
    const token =
      localStorage.getItem("token") ??
      localStorage.getItem("jwt") ??
      localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Login required to place an order.");
      return;
    }

    const itemsPayload = draftItems.map((item) => ({
      product_item_id: resolveProductItemId(item.drinkId),
      quantity: item.quantity,
    }));
    const missing = itemsPayload.find((item) => !item.product_item_id);
    if (missing) {
      toast.error("Some items could not be matched to backend products.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsPayload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to place order");
      }
      clearDraft();
      toast.success("Order placed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to place order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            onClick={handleConfirmOrder}
            disabled={draftItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Confirm Order"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
