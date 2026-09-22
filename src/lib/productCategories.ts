import { t, type MessageKey } from "@/i18n";

/** Category names in `categories` table (product type via `products.category_id`). */
export const PRODUCT_CATEGORY = {
  DRINK: "Drink",
  MEAL: "Meal",
  DESSERT: "Dessert",
  OTHER: "Other",
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

/**
 * The order top-level categories are presented in, everywhere: menu sections,
 * terminal filter pills, admin grouping and the add-product form. One list so
 * the menu and the terminal can't drift apart, which they previously had.
 */
export const PRODUCT_CATEGORY_ORDER: ProductCategoryName[] = [
  PRODUCT_CATEGORY.DRINK,
  PRODUCT_CATEGORY.MEAL,
  PRODUCT_CATEGORY.DESSERT,
  PRODUCT_CATEGORY.OTHER,
];

/** Categories available in the admin add-product form. */
export const ADMIN_CREATABLE_CATEGORIES: ProductCategoryName[] =
  PRODUCT_CATEGORY_ORDER;

/**
 * Section / filter-pill heading for each category, as a catalogue key.
 *
 * The headings themselves live in `src/i18n/messages/products.json`; resolve
 * one with `categoryLabel(name, t)` from `@/i18n`, or `t(PRODUCT_CATEGORY_LABEL_KEY[c])`
 * when the category is already narrowed to this union.
 */
export const PRODUCT_CATEGORY_LABEL_KEY: Record<
  ProductCategoryName,
  MessageKey
> = {
  [PRODUCT_CATEGORY.DRINK]: "products.category.drink",
  [PRODUCT_CATEGORY.MEAL]: "products.category.meal",
  [PRODUCT_CATEGORY.DESSERT]: "products.category.dessert",
  [PRODUCT_CATEGORY.OTHER]: "products.category.other",
};

/**
 * Bucket for a product whose category matches none of the above — a category
 * an admin created directly, or one whose row was deleted. Deliberately NOT
 * "Other", which is now a real category an admin can file things under.
 *
 * Kept as the English string because it is also a *grouping key*: rows are
 * bucketed under it before anything is rendered, and `subtypeLabel()`
 * translates it on the way to the screen.
 */
export const UNCATEGORIZED_LABEL = "Uncategorized";

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

/**
 * Categories, cached at module scope for the life of the page.
 *
 * Pass `force` to go back to the server — the admin form does on mount, so a
 * category seeded by a migration while this tab was open is picked up. Without
 * it, saving a product in that new category fails with "category is missing"
 * until a full reload. Mirrors the mobile client's `fetchCategories(force)`.
 */
export async function fetchCategories(
  apiUrl: string,
  force = false
): Promise<CategoryRow[]> {
  if (categoriesCache && !force) return categoriesCache;
  const response = await fetch(`${apiUrl}/api/categories`);
  if (!response.ok) {
    throw new Error(t("errors.loadCategories"));
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

/**
 * A top-level category row by name. Ported from the mobile app's
 * `src/lib/categories.ts`, which needed it first because its product form has
 * always been category-generic.
 */
export function getTopLevelCategory(
  categories: CategoryRow[],
  name: string | null | undefined
): CategoryRow | undefined {
  const key = normalizeCategoryName(name);
  if (!key) return undefined;
  return categories.find(
    (c) => c.parent_id == null && normalizeCategoryName(c.name) === key
  );
}

export function getDrinkParentCategory(
  categories: CategoryRow[]
): CategoryRow | undefined {
  return getTopLevelCategory(categories, PRODUCT_CATEGORY.DRINK);
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
