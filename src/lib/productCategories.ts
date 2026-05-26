/** Category names in `categories` table (product type via `products.category_id`). */
export const PRODUCT_CATEGORY = {
  DRINK: "Drink",
  MEAL: "Meal",
  DESSERT: "Dessert",
} as const;

export type ProductCategoryName =
  (typeof PRODUCT_CATEGORY)[keyof typeof PRODUCT_CATEGORY];

/** Categories available in the admin add-product form. */
export const ADMIN_CREATABLE_CATEGORIES: ProductCategoryName[] = [
  PRODUCT_CATEGORY.DRINK,
  PRODUCT_CATEGORY.DESSERT,
  PRODUCT_CATEGORY.MEAL,
];

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

let categoryIdByName: Map<string, number> | null = null;

export async function fetchCategoryIds(
  apiUrl: string
): Promise<Map<string, number>> {
  if (categoryIdByName) return categoryIdByName;
  const response = await fetch(`${apiUrl}/api/categories`);
  if (!response.ok) {
    throw new Error("Failed to load categories");
  }
  const data = await response.json();
  const map = new Map<string, number>();
  if (Array.isArray(data)) {
    for (const row of data) {
      if (row?.name != null && row?.id != null) {
        map.set(normalizeCategoryName(String(row.name)), Number(row.id));
      }
    }
  }
  categoryIdByName = map;
  return map;
}

export function getCategoryId(
  map: Map<string, number>,
  name: ProductCategoryName
): number | undefined {
  return map.get(normalizeCategoryName(name));
}

export function clearCategoryCache(): void {
  categoryIdByName = null;
}
