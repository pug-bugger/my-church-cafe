"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import type { Drink } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSheet } from "@/components/terminal/ProductSheet";
import {
  drinkSubtypeLabel,
  groupByDrinkSubtype,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * The counter tablet's product picker: one row of category pills over a single
 * tile grid. The canvas trades the old per-subtype stack for this so a barista
 * never scrolls past a heading to reach a drink.
 */

const DESSERTS_CATEGORY = "Desserts";
const ALL_CATEGORY = "All";

type Category = { name: string; items: Drink[] };

function optionsLabel(product: Drink): string {
  const count = product.availableOptions.length;
  if (count === 0) return "no options";
  return `${count} ${count === 1 ? "option" : "options"}`;
}

function PickerSkeleton() {
  return (
    <div className="space-y-[18px]">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[126px] rounded-card" />
        ))}
      </div>
    </div>
  );
}

export function ProductPicker() {
  const drinks = useAppStore((state) => state.drinks);
  const desserts = useAppStore((state) => state.desserts);
  const drinksLoading = useAppStore((state) => state.drinksLoading);
  const dessertsLoading = useAppStore((state) => state.dessertsLoading);
  const loadDrinks = useAppStore((state) => state.loadDrinks);
  const loadDesserts = useAppStore((state) => state.loadDesserts);
  const subtypeOrder = useDrinkSubtypeOrder();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadDrinks();
    loadDesserts();
  }, [loadDrinks, loadDesserts]);

  /**
   * "All" first, then drink subtypes in menu order, then desserts. The All tab
   * is what a barista reaches for when they know the drink but not its group.
   */
  const categories = useMemo<Category[]>(() => {
    const activeDrinks = drinks.filter((d) => d.active !== false);
    const activeDesserts = desserts.filter((d) => d.active !== false);
    const sections = groupByDrinkSubtype(
      activeDrinks,
      drinkSubtypeLabel,
      subtypeOrder
    ).map((section) => ({ name: section.title, items: section.items }));
    if (activeDesserts.length) {
      sections.push({ name: DESSERTS_CATEGORY, items: activeDesserts });
    }
    if (sections.length === 0) return [];
    // Built from the grouped sections so All follows the same running order.
    const all = sections.flatMap((section) => section.items);
    return [{ name: ALL_CATEGORY, items: all }, ...sections];
  }, [drinks, desserts, subtypeOrder]);

  // Keep a valid selection as categories load or a category empties out.
  const selected =
    categories.find((c) => c.name === activeCategory) ?? categories[0] ?? null;

  const openProduct = useMemo(() => {
    if (!openId) return null;
    return (
      [...drinks, ...desserts].find((product) => product.id === openId) ?? null
    );
  }, [openId, drinks, desserts]);

  if (drinksLoading || dessertsLoading) {
    return <PickerSkeleton />;
  }

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing is on sale right now. Add products under Manage.
      </p>
    );
  }

  return (
    <>
      <div className="mb-[18px] flex flex-wrap gap-2">
        {categories.map((category) => {
          const on = category.name === selected?.name;
          return (
            <button
              key={category.name}
              type="button"
              aria-pressed={on}
              onClick={() => setActiveCategory(category.name)}
              className={cn(
                "press flex min-h-12 items-center gap-2.5 rounded-full border px-5 text-[15px] font-semibold",
                on
                  ? "border-ac bg-primary text-primary-foreground"
                  : "border-line bg-surface text-foreground hover:bg-ink/5"
              )}
            >
              {category.name}
              <span className="num text-xs opacity-55">
                {category.items.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
        {selected?.items.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => setOpenId(product.id)}
            className="press tile flex min-h-[126px] flex-col justify-between gap-3 rounded-card border border-line bg-surface p-[18px] text-left text-foreground"
          >
            <span className="text-[19px] font-bold leading-[1.2] tracking-[-0.01em]">
              {product.name}
            </span>
            <span className="flex items-center justify-between gap-2.5">
              <span className="num text-[17px] font-semibold">
                {formatPrice(product.price)}
              </span>
              <span className="rounded-full bg-ac-soft px-2.5 py-[5px] text-xs font-semibold text-ac-dark">
                {optionsLabel(product)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <ProductSheet product={openProduct} onClose={() => setOpenId(null)} />
    </>
  );
}
