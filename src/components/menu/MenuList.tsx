"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { DataState } from "@/components/ui/data-state";
import { defaultDrinks } from "@/data/defaultDrinks";
import {
  groupByDrinkSubtype,
  menuProductSubtypeLabel,
} from "@/lib/drinkSubtypeGroups";
import { useDrinkSubtypeOrder } from "@/hooks/useDrinkSubtypeOrder";
import {
  isProductCategory,
  PRODUCT_CATEGORY,
  type ProductCategoryName,
} from "@/lib/productCategories";
import { formatPrice } from "@/lib/format";

type Product = {
  id: string | number;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  category_name?: string | null;
  parent_category_name?: string | null;
  available?: boolean | number | null;
};

type MenuGroup = { name: string; items: Product[] };

function productTypeName(product: Product): string | null {
  return product.parent_category_name ?? product.category_name ?? null;
}

const MENU_SECTIONS: { title: string; category: ProductCategoryName }[] = [
  { title: "Drinks", category: PRODUCT_CATEGORY.DRINK },
  { title: "Meals", category: PRODUCT_CATEGORY.MEAL },
  { title: "Desserts", category: PRODUCT_CATEGORY.DESSERT },
];

function isAvailable(value: Product["available"]): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return value === 1;
  return value;
}

/** "Sunday, 1 September" — the day the board is being read. */
function dateline(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function MenuListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3.5 rounded-card border border-line bg-surface p-[22px]"
        >
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 5 }).map((_, row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MenuList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subtypeOrder = useDrinkSubtypeOrder();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setProducts(
        defaultDrinks.map((drink) => ({
          id: drink.id,
          name: drink.name,
          description: drink.description,
          base_price: drink.price,
          category_name: drink.subtypeName ?? PRODUCT_CATEGORY.DRINK,
          parent_category_name: PRODUCT_CATEGORY.DRINK,
          available: true,
        }))
      );
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Product[]>("/api/products", {
          auth: false,
          signal: controller.signal,
        });
        if (!Array.isArray(data)) {
          throw new Error("Invalid response while loading menu");
        }
        setProducts(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not load menu right now.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, []);

  const availableProducts = useMemo(
    () => products.filter((product) => isAvailable(product.available)),
    [products]
  );

  /**
   * One flat list of groups — drink subtypes first (in menu order), then the
   * other top-level categories, then anything uncategorised. The canvas lays
   * these out as equal cards rather than nesting drinks under a heading.
   */
  const groups = useMemo<MenuGroup[]>(() => {
    const drinkItems = availableProducts.filter((p) =>
      isProductCategory(productTypeName(p), PRODUCT_CATEGORY.DRINK)
    );
    const result: MenuGroup[] = groupByDrinkSubtype(
      drinkItems,
      menuProductSubtypeLabel,
      subtypeOrder
    ).map((section) => ({ name: section.title, items: section.items }));

    for (const { title, category } of MENU_SECTIONS) {
      if (category === PRODUCT_CATEGORY.DRINK) continue;
      const items = availableProducts.filter((p) =>
        isProductCategory(productTypeName(p), category)
      );
      if (items.length) result.push({ name: title, items });
    }

    const uncategorized = availableProducts.filter((p) => {
      const type = productTypeName(p);
      if (!type) return true;
      return !MENU_SECTIONS.some(({ category }) =>
        isProductCategory(type, category)
      );
    });
    if (uncategorized.length) {
      result.push({ name: "Other", items: uncategorized });
    }

    return result;
  }, [availableProducts, subtypeOrder]);

  return (
    <DataState
      loading={loading}
      error={error}
      isEmpty={availableProducts.length === 0}
      loadingFallback={<MenuListSkeleton />}
      emptyMessage="No products are currently available."
    >
      <h1 className="mb-1 text-[28px] font-extrabold tracking-[-0.02em]">
        Today at the cafe
      </h1>
      <p className="mb-[22px] text-sm text-muted-foreground">
        {dateline()} · prices in euro
      </p>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {groups.map((group) => (
          <section
            key={group.name}
            className="rounded-card border border-line bg-surface p-[22px]"
          >
            <h2 className="mb-3.5 text-base font-bold text-ac-dark">
              {group.name}
            </h2>
            <ul className="flex flex-col gap-[11px]">
              {group.items.map((product) => (
                <li
                  key={String(product.id)}
                  className="flex items-baseline gap-2.5"
                >
                  <span className="text-[15px]">{product.name}</span>
                  {/* Dot leader tying the name to its price. */}
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-line"
                  />
                  <span className="num text-[15px] font-semibold">
                    {formatPrice(product.base_price)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DataState>
  );
}
