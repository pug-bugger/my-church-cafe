"use client";

import { useAppStore } from "@/store";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DrinkOrderForm } from "@/components/terminal/DrinkOrderForm";
import { useEffect, useMemo, useState } from "react";
import {
  productImageClassName,
  resolveProductImageUrl,
} from "@/lib/imageUrl";

function DessertListSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function DessertList() {
  const desserts = useAppStore((state) => state.desserts);
  const dessertsLoading = useAppStore((state) => state.dessertsLoading);
  const loadDesserts = useAppStore((state) => state.loadDesserts);
  const [openId, setOpenId] = useState<string | null>(null);

  const activeDesserts = useMemo(
    () => desserts.filter((d) => d.active !== false),
    [desserts]
  );

  const selectedDessert = useMemo(
    () => (openId ? (activeDesserts.find((d) => d.id === openId) ?? null) : null),
    [activeDesserts, openId]
  );

  useEffect(() => {
    loadDesserts();
  }, [loadDesserts]);

  if (dessertsLoading) {
    return <DessertListSkeleton />;
  }

  if (activeDesserts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No desserts are available right now.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {activeDesserts.map((dessert) => (
          <Card
            key={dessert.id}
            className="flex cursor-pointer flex-col"
            onClick={() => setOpenId(dessert.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveProductImageUrl(dessert.imageUrl)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={productImageClassName(
                      resolveProductImageUrl(dessert.imageUrl)
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="line-clamp-2">{dessert.name}</CardTitle>
                  <CardDescription>
                    ${dessert.price.toFixed(2)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Dialog
        open={selectedDessert != null}
        onOpenChange={(open) => !open && setOpenId(null)}
      >
        {selectedDessert ? (
          <DialogContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>{selectedDessert.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Choose quantity and add this dessert to your order.
              </DialogDescription>
            </DialogHeader>
            <DrinkOrderForm
              drink={selectedDessert}
              onSuccess={() => setOpenId(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
