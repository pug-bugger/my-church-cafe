"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DrinkForm } from "./DrinkForm";
import { Drink } from "@/types";
import { Avatar } from "@/components/ui/avatar";

export function DrinkManagement() {
  const drinks = useAppStore((state) => state.drinks);
  const deleteDrink = useAppStore((state) => state.deleteDrink);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedDrink(null)}>
              Add New Drink
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedDrink ? "Edit Drink" : "Add New Drink"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Fill out the drink details and save.
              </DialogDescription>
            </DialogHeader>
            <DrinkForm drink={selectedDrink} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drinks.map((drink) => (
          <Card key={drink.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <img src={drink.imageUrl} alt={drink.name} />
                </Avatar>
                <div>
                  <CardTitle>{drink.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ${drink.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {drink.description}
              </p>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available Options:</h4>
                <ul className="text-sm text-muted-foreground">
                  {drink.availableOptions.map((option) => (
                    <li key={option.id}>
                      {option.name}: {option.values.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedDrink(drink)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit Drink</DialogTitle>
                      <DialogDescription className="sr-only">
                        Update the drink details and save your changes.
                      </DialogDescription>
                    </DialogHeader>
                    <DrinkForm drink={drink} />
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteDrink(drink.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {drinks.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No drinks available. Add your first drink to get started.
        </div>
      )}
    </div>
  );
}
