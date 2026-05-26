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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DrinkOrderForm } from "@/components/terminal/DrinkOrderForm";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    loadDesserts();
  }, [loadDesserts]);

  if (dessertsLoading) {
    return <DessertListSkeleton />;
  }

  if (desserts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No desserts are available right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {desserts.map((dessert) => (
        <Dialog
          key={dessert.id}
          open={openId === dessert.id}
          onOpenChange={(open) => setOpenId(open ? dessert.id : null)}
        >
          <DialogTrigger asChild>
            <Card
              className="flex flex-col cursor-pointer"
              onClick={() => setOpenId(dessert.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-lg border overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveProductImageUrl(dessert.imageUrl)}
                      alt=""
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
          </DialogTrigger>
          <DialogContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>{dessert.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Choose quantity and add this dessert to your order.
              </DialogDescription>
            </DialogHeader>
            <DrinkOrderForm
              drink={dessert}
              onSuccess={() => setOpenId(null)}
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
