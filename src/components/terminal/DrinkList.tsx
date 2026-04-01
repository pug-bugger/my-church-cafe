"use client";

import { useAppStore } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { resolveMediaUrl } from "@/lib/imageUrl";

function DrinkListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function DrinkList() {
  const drinks = useAppStore((state) => state.drinks);
  const drinksLoading = useAppStore((state) => state.drinksLoading);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadDrinks();
  }, [loadDrinks]);

  if (drinksLoading) {
    return <DrinkListSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {drinks.map((drink) => (
        <Dialog
          key={drink.id}
          open={openId === drink.id}
          onOpenChange={(open) => setOpenId(open ? drink.id : null)}
        >
          <DialogTrigger asChild>
            <Card
              className="flex flex-col"
              onClick={() => {
                console.log("clicked", drink.id);

                setOpenId(drink.id);
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-lg border overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(drink.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="line-clamp-2">{drink.name}</CardTitle>
                    <CardDescription>${drink.price.toFixed(2)}</CardDescription>
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
              <DialogTitle>{drink.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Customize your drink options and add it to your order.
              </DialogDescription>
            </DialogHeader>
            <DrinkOrderForm drink={drink} onSuccess={() => setOpenId(null)} />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
