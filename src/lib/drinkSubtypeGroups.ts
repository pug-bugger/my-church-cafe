import type { Drink } from "@/types";
import {
  DRINK_SUBTYPE,
  fetchCategories,
  getDrinkSubtypes,
  isProductCategory,
  PRODUCT_CATEGORY,
} from "@/lib/productCategories";

export const UNCATEGORIZED_DRINK_LABEL = "Uncategorized";

export type DrinkSubtypeSection<T> = {
  title: string;
  items: T[];
};

export function defaultDrinkSubtypeOrder(): string[] {
  return Object.values(DRINK_SUBTYPE);
}

export function drinkSubtypeLabel(
  drink: Pick<Drink, "subtypeName" | "categoryName">
): string {
  if (drink.subtypeName?.trim()) return drink.subtypeName.trim();
  return UNCATEGORIZED_DRINK_LABEL;
}

/** Subtype name for menu API rows (child category under Drink). */
export function menuProductSubtypeName(product: {
  category_name?: string | null;
  parent_category_name?: string | null;
}): string | null {
  if (
    product.parent_category_name &&
    isProductCategory(product.parent_category_name, PRODUCT_CATEGORY.DRINK)
  ) {
    return product.category_name?.trim() || null;
  }
  return null;
}

export function menuProductSubtypeLabel(product: {
  category_name?: string | null;
  parent_category_name?: string | null;
}): string {
  return menuProductSubtypeName(product) ?? UNCATEGORIZED_DRINK_LABEL;
}

export function groupByDrinkSubtype<T>(
  items: T[],
  getLabel: (item: T) => string,
  orderedTitles: string[] = defaultDrinkSubtypeOrder()
): DrinkSubtypeSection<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = getLabel(item) || UNCATEGORIZED_DRINK_LABEL;
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const seen = new Set<string>();
  const sections: DrinkSubtypeSection<T>[] = [];

  for (const title of orderedTitles) {
    const group = buckets.get(title);
    if (group?.length) {
      sections.push({ title, items: group });
      seen.add(title);
    }
  }

  const remaining = [...buckets.keys()]
    .filter((k) => !seen.has(k))
    .sort((a, b) => {
      if (a === UNCATEGORIZED_DRINK_LABEL) return 1;
      if (b === UNCATEGORIZED_DRINK_LABEL) return -1;
      return a.localeCompare(b);
    });

  for (const title of remaining) {
    const group = buckets.get(title);
    if (group?.length) sections.push({ title, items: group });
  }

  return sections;
}

export async function fetchDrinkSubtypeOrder(
  apiUrl: string
): Promise<string[]> {
  try {
    const rows = await fetchCategories(apiUrl);
    const names = getDrinkSubtypes(rows).map((s) => s.name);
    return names.length ? names : defaultDrinkSubtypeOrder();
  } catch {
    return defaultDrinkSubtypeOrder();
  }
}
