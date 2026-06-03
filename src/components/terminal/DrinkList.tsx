"use client";

import { useAppStore } from "@/store";
import type { Drink } from "@/types";
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
import { DrinkSubtypeSections } from "@/components/drinks/DrinkSubtypeSections";
import { useEffect, useMemo, useState } from "react";
import {
  productImageClassName,
  resolveProductImageUrl,
} from "@/lib/imageUrl";
import {
  drinkSubtypeLabel,
  groupByDrinkSubtype,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";

function DrinkListSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="space-y-4">
          <Skeleton className="h-6 w-28" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <Skeleton className="h-5 w-24 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DrinkCardGrid({
  drinks,
  onSelect,
}: {
  drinks: Drink[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {drinks.map((drink) => (
        <Card
          key={drink.id}
          className="flex cursor-pointer flex-col"
          onClick={() => onSelect(drink.id)}
        >
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveProductImageUrl(drink.imageUrl)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={productImageClassName(
                    resolveProductImageUrl(drink.imageUrl)
                  )}
                />
              </div>
              <div className="min-w-0">
                <CardTitle className="line-clamp-2">{drink.name}</CardTitle>
                <CardDescription>${drink.price.toFixed(2)}</CardDescription>
              </div>
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
  const subtypeOrder = useDrinkSubtypeOrder();
  const [openId, setOpenId] = useState<string | null>(null);

  const drinkSections = useMemo(
    () => groupByDrinkSubtype(drinks, drinkSubtypeLabel, subtypeOrder),
    [drinks, subtypeOrder]
  );

  const selectedDrink = useMemo(
    () => (openId ? (drinks.find((d) => d.id === openId) ?? null) : null),
    [drinks, openId]
  );

  useEffect(() => {
    loadDrinks();
  }, [loadDrinks]);

  if (drinksLoading) {
    return <DrinkListSkeleton />;
  }

  if (drinks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No drinks available.
      </p>
    );
  }

  return (
    <>
      <DrinkSubtypeSections
        sections={drinkSections}
        renderItems={(sectionDrinks) => (
          <DrinkCardGrid drinks={sectionDrinks} onSelect={setOpenId} />
        )}
      />
      <Dialog
        open={selectedDrink != null}
        onOpenChange={(open) => !open && setOpenId(null)}
      >
        {selectedDrink ? (
          <DialogContent
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>{selectedDrink.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Customize your drink options and add it to your order.
              </DialogDescription>
            </DialogHeader>
            <DrinkOrderForm
              drink={selectedDrink}
              onSuccess={() => setOpenId(null)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
