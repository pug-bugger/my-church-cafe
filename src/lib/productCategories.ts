/** Category names in `categories` table (product type via `products.category_id`). */
export const PRODUCT_CATEGORY = {
  DRINK: "Drink",
  MEAL: "Meal",
  DESSERT: "Dessert",
} as const;

export type ProductCategoryName =
  (typeof PRODUCT_CATEGORY)[keyof typeof PRODUCT_CATEGORY];

/** Default drink subtypes (child categories under Drink). */
export const DRINK_SUBTYPE = {
  COFFEE: "Coffee",
  OTHER: "Other drinks",
  SEASONAL: "Season drinks",
} as const;

export type DrinkSubtypeName =
  (typeof DRINK_SUBTYPE)[keyof typeof DRINK_SUBTYPE];

/** Categories available in the admin add-product form. */
export const ADMIN_CREATABLE_CATEGORIES: ProductCategoryName[] = [
  PRODUCT_CATEGORY.DRINK,
  PRODUCT_CATEGORY.DESSERT,
  PRODUCT_CATEGORY.MEAL,
];

export type CategoryRow = {
  id: number;
  name: string;
  parent_id: number | null;
};

export function normalizeCategoryName(
  name: string | null | undefined
): string {
  return (name ?? "").trim().toLowerCase();
}

export function isProductCategory(
  categoryName: string | null | undefined,
  expected: ProductCategoryName
): boolean {
  return (
    normalizeCategoryName(categoryName) === normalizeCategoryName(expected)
  );
}

let categoriesCache: CategoryRow[] | null = null;

export async function fetchCategories(apiUrl: string): Promise<CategoryRow[]> {
  if (categoriesCache) return categoriesCache;
  const response = await fetch(`${apiUrl}/api/categories`);
  if (!response.ok) {
    throw new Error("Failed to load categories");
  }
  const data = await response.json();
  const rows: CategoryRow[] = [];
  if (Array.isArray(data)) {
    for (const row of data) {
      if (row?.name != null && row?.id != null) {
        rows.push({
          id: Number(row.id),
          name: String(row.name),
          parent_id:
            row.parent_id != null ? Number(row.parent_id) : null,
        });
      }
    }
  }
  categoriesCache = rows;
  return rows;
}

/** @deprecated Use fetchCategories — returns name → id map for top-level names. */
export async function fetchCategoryIds(
  apiUrl: string
): Promise<Map<string, number>> {
  const rows = await fetchCategories(apiUrl);
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(normalizeCategoryName(row.name), row.id);
  }
  return map;
}

export function getCategoryId(
  map: Map<string, number>,
  name: string
): number | undefined {
  return map.get(normalizeCategoryName(name));
}

export function getDrinkParentCategory(
  categories: CategoryRow[]
): CategoryRow | undefined {
  return categories.find(
    (c) =>
      c.parent_id == null &&
      isProductCategory(c.name, PRODUCT_CATEGORY.DRINK)
  );
}

export function getDrinkSubtypes(
  categories: CategoryRow[]
): CategoryRow[] {
  const drink = getDrinkParentCategory(categories);
  if (!drink) return [];
  return categories
    .filter((c) => c.parent_id === drink.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findSubtypeByName(
  categories: CategoryRow[],
  subtypeName: string | null | undefined
): CategoryRow | undefined {
  if (!subtypeName?.trim()) return undefined;
  const drink = getDrinkParentCategory(categories);
  if (!drink) return undefined;
  const key = normalizeCategoryName(subtypeName);
  return categories.find(
    (c) =>
      c.parent_id === drink.id && normalizeCategoryName(c.name) === key
  );
}

export function clearCategoryCache(): void {
  categoriesCache = null;
}
