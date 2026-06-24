"use client";

import { getOrderableProducts, useAppStore } from "@/store";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

export function CurrentOrder() {
  const draftItems = useAppStore((state) => state.draftItems);
  const drinks = useAppStore((state) => state.drinks);
  const desserts = useAppStore((state) => state.desserts);
  const orderableProducts = useMemo(
    () => getOrderableProducts({ drinks, desserts }),
    [drinks, desserts]
  );
  const removeDraftItem = useAppStore((state) => state.removeDraftItem);
  const clearDraft = useAppStore((state) => state.clearDraft);
  const [products, setProducts] = useState<
    { id: number; name: string | null }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComment, setOrderComment] = useState("");
  const [customerName, setCustomerName] = useState("");

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL, []);

  const getProductById = (id: string) =>
    orderableProducts.find((d) => d.id === id);

  const total = draftItems.reduce((sum, item) => {
    const product = getProductById(item.drinkId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  useEffect(() => {
    if (draftItems.length === 0) {
      setOrderComment("");
      setCustomerName("");
    }
  }, [draftItems.length]);

  useEffect(() => {
    if (!apiUrl) return;
    let isActive = true;
    const loadProducts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load products");
        }
        const data = await response.json();
        if (isActive) {
          setProducts(
            Array.isArray(data)
              ? data.map((item) => ({ id: item.id, name: item.name }))
              : []
          );
        }
      } catch (_err) {
        if (isActive) {
          setProducts([]);
        }
      }
    };
    loadProducts();
    return () => {
      isActive = false;
    };
  }, [apiUrl]);

  const resolveProductId = (drinkId: string) => {
    const drink = getProductById(drinkId);
    if (!drink) return null;
    const normalized = (value?: string) =>
      (value || "").trim().toLowerCase();
    const byId =
      Number.isFinite(Number(drink.id)) &&
      products.find((item) => item.id === Number(drink.id));
    if (byId) return byId.id;
    const byName = products.find(
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

    const orderItemsPayload = draftItems.map((item) => ({
      quantity: item.quantity,
      productId: resolveProductId(item.drinkId),
      selectedOptions: item.selectedOptions,
      comment: item.comment || null,
    }));
    const missing = orderItemsPayload.find((item) => !item.productId);
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
        body: JSON.stringify({
          order: {
            comment: orderComment.trim() || null,
            customer_name: customerName.trim() || null,
            order_items: orderItemsPayload,
          },
        }),
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
    <Card className="flex max-h-[calc(100dvh-4rem-3rem)] flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>Current Order</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        {draftItems.length === 0 ? (
          <Alert>
            <AlertDescription>
              No items added yet. Select a drink or dessert to begin.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-3">
            {draftItems.map((item) => {
              const drink = getProductById(item.drinkId);
              if (!drink) return null;
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-base">
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
                    {item.comment && (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        {item.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="whitespace-nowrap font-medium text-base">
                      ${(drink.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 w-14 shrink-0 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-7"
                      aria-label={`Remove ${drink.name}`}
                      onClick={() => removeDraftItem(item.id)}
                    >
                      <X />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {draftItems.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <Input
              placeholder="Customer name..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Order note..."
              value={orderComment}
              onChange={(e) => setOrderComment(e.target.value)}
              className="text-sm"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex shrink-0 flex-col items-start gap-3">
        <div className="w-full whitespace-nowrap text-left font-semibold">
          Total: ${total.toFixed(2)}
        </div>
        <div className="flex w-full min-w-0 gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14 shrink-0 rounded-full p-0 [&_svg]:size-6"
            aria-label="Clear order"
            onClick={clearDraft}
            disabled={draftItems.length === 0}
          >
            <Trash2 />
          </Button>
          <Button
            size="lg"
            className="min-w-0 flex-1 text-base"
            onClick={handleConfirmOrder}
            disabled={draftItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Loading..." : "Confirm"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
