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
import { DrinkOrderForm } from "@/components/terminal/DrinkOrderForm";
import { useEffect, useState } from "react";

export function DrinkList() {
  const drinks = useAppStore((state) => state.drinks);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadDrinks();
  }, [loadDrinks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                console.log("clicked", drink.id);
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle>{drink.name}</CardTitle>
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
