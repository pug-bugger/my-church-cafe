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
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_LABEL,
  PRODUCT_CATEGORY_ORDER,
} from "@/lib/productCategories";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * The counter tablet's product picker: one row of category pills over a single
 * tile grid. The canvas trades the old per-subtype stack for this so a barista
 * never scrolls past a heading to reach a drink.
 */

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

/** One tappable product: name, price, and how many questions it will ask. */
function ProductTile({
  product,
  onOpen,
}: {
  product: Drink;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(product.id)}
      className="press tile flex min-h-[126px] flex-col justify-between gap-3 rounded-card border border-line bg-surface p-[18px] text-left text-foreground"
    >
      <span className="flex flex-col gap-1">
        <span className="text-[19px] font-bold leading-[1.2] tracking-[-0.01em]">
          {product.name}
        </span>
        {product.description?.trim() ? (
          <span className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {product.description.trim()}
          </span>
        ) : null}
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
  );
}

function TileGrid({
  items,
  onOpen,
}: {
  items: Drink[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
      {items.map((product) => (
        <ProductTile key={product.id} product={product} onOpen={onOpen} />
      ))}
    </div>
  );
}

/**
 * Caption above a run of tiles. Only shown under "All", where the pill row no
 * longer tells you which group you are looking at.
 */
function CategoryLabel({ name, count }: { name: string; count: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <h3 className="text-[13px] font-semibold text-muted-foreground">
        {name}
      </h3>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="num text-xs text-muted-foreground/70">{count}</span>
    </div>
  );
}

export function ProductPicker() {
  const products = useAppStore((state) => state.products);
  const productsLoading = useAppStore((state) => state.productsLoading);
  const loadProducts = useAppStore((state) => state.loadProducts);
  const subtypeOrder = useDrinkSubtypeOrder();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /**
   * "All" first, then drink subtypes in menu order, then every other category
   * in the shared order. The All tab is what a barista reaches for when they
   * know the drink but not its group.
   */
  const sections = useMemo<Category[]>(() => {
    const sellable = products.filter((p) => p.active !== false);
    const drinks = sellable.filter((p) =>
      isProductCategory(p.categoryName, PRODUCT_CATEGORY.DRINK)
    );
    const groups = groupByDrinkSubtype(
      drinks,
      drinkSubtypeLabel,
      subtypeOrder
    ).map((section) => ({ name: section.title, items: section.items }));

    for (const category of PRODUCT_CATEGORY_ORDER) {
      if (category === PRODUCT_CATEGORY.DRINK) continue; // already split by subtype
      const items = sellable.filter((p) =>
        isProductCategory(p.categoryName, category)
      );
      if (items.length) {
        groups.push({ name: PRODUCT_CATEGORY_LABEL[category], items });
      }
    }
    return groups;
  }, [products, subtypeOrder]);

  const categories = useMemo<Category[]>(() => {
    if (sections.length === 0) return [];
    // Built from the grouped sections so All follows the same running order.
    const all = sections.flatMap((section) => section.items);
    return [{ name: ALL_CATEGORY, items: all }, ...sections];
  }, [sections]);

  // Keep a valid selection as categories load or a category empties out.
  const selected =
    categories.find((c) => c.name === activeCategory) ?? categories[0] ?? null;

  const openProduct = useMemo(() => {
    if (!openId) return null;
    return products.find((product) => product.id === openId) ?? null;
  }, [openId, products]);

  if (productsLoading) {
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

      {selected?.name === ALL_CATEGORY ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.name}>
              <CategoryLabel name={section.name} count={section.items.length} />
              <TileGrid items={section.items} onOpen={setOpenId} />
            </section>
          ))}
        </div>
      ) : (
        <TileGrid items={selected?.items ?? []} onOpen={setOpenId} />
      )}

      <ProductSheet product={openProduct} onClose={() => setOpenId(null)} />
    </>
  );
}
