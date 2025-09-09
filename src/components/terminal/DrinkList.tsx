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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DrinkOrderForm } from "@/components/terminal/DrinkOrderForm";
import { Avatar } from "@/components/ui/avatar";
import { useState } from "react";
import { Drink } from "@/types";
import SvgIcon from "@/components/SvgIcon";

export function DrinkList() {
  const drinks = useAppStore((state) => state.drinks);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {drinks.map((drink) => (
        <Card key={drink.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              {/* <Avatar className="h-16 w-16">
                <SvgIcon name="coffee" size={64} />
              </Avatar> */}

              <div>
                <CardTitle>{drink.name}</CardTitle>
                <CardDescription>${drink.price.toFixed(2)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{drink.description}</p>
          </CardContent>
          <CardFooter className="mt-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="w-full"
                  onClick={() => setSelectedDrink(drink)}
                >
                  Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Order {drink.name}</DialogTitle>
                </DialogHeader>
                {selectedDrink && <DrinkOrderForm drink={selectedDrink} />}
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
