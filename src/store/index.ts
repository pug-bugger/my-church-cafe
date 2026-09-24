import { create } from 'zustand';
import { Drink, OrderItem, ServerOrder, OrderStatus } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';
import { mapProductApiToDrinkOptions } from '@/lib/drinkOptions';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { t } from '@/i18n';
import {
  fetchCategories,
  findSubtypeByName,
  getDrinkParentCategory,
  getTopLevelCategory,
  isProductCategory,
  PRODUCT_CATEGORY,
  type ProductCategoryName,
} from '@/lib/productCategories';

function areSelectedOptionsEqual(
  a: OrderItem['selectedOptions'],
  b: OrderItem['selectedOptions']
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function mapApiProductToDrink(product: Record<string, unknown>): Drink {
  const categoryName = product.category_name
    ? String(product.category_name)
    : undefined;
  const parentCategoryName = product.parent_category_name
    ? String(product.parent_category_name)
    : undefined;
  const categoryId =
    product.category_id != null ? Number(product.category_id) : undefined;
  const isDrinkSubtype =
    parentCategoryName &&
    isProductCategory(parentCategoryName, PRODUCT_CATEGORY.DRINK);
  const topLevel = isDrinkSubtype
    ? parentCategoryName
    : categoryName;
  const subtypeName = isDrinkSubtype ? categoryName : undefined;

  return {
    id: String(product.id),
    name: String(product.name ?? t("common.unnamed")),
    secondaryName: subtypeName ?? categoryName,
    categoryName: topLevel,
    subtypeName,
    categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
    description: String(product.description ?? ""),
    price: Number(product.base_price ?? 0),
    imageUrl: product.image_url ? String(product.image_url) : undefined,
    availableOptions: mapProductApiToDrinkOptions(
      product.drink_options as Parameters<typeof mapProductApiToDrinkOptions>[0]
    ),
    active: product.available !== 0 && product.available !== false,
    available_until: product.available_until != null ? String(product.available_until) : null,
    sortOrder:
      product.sort_order != null ? Number(product.sort_order) : undefined,
  };
}

/**
 * The `categories` row a product should be filed under.
 *
 * Drinks are a special case: they hang off a *subtype* (Coffee, Season drinks)
 * rather than the Drink row itself. Every other top-level category — Meal,
 * Dessert, Other, or one an admin adds later — resolves by name, which is what
 * makes adding a category a migration rather than a code change.
 */
async function resolveCategoryId(
  apiUrl: string,
  product: Omit<Drink, "id">
): Promise<number | undefined> {
  const categories = await fetchCategories(apiUrl);
  const topLevel = product.categoryName ?? PRODUCT_CATEGORY.DRINK;

  if (isProductCategory(topLevel, PRODUCT_CATEGORY.DRINK)) {
    if (product.categoryId != null) {
      const match = categories.find((c) => c.id === product.categoryId);
      if (match) return match.id;
    }
    const fromSubtype = findSubtypeByName(categories, product.subtypeName);
    if (fromSubtype) return fromSubtype.id;
    return getDrinkParentCategory(categories)?.id;
  }

  return getTopLevelCategory(categories, topLevel)?.id;
}

/** Map frontend product (without id) to backend POST/PUT /api/products body. */
function productToApiBody(
  product: Omit<Drink, "id">,
  categoryId?: number
) {
  const drink_option_definition_ids = (product.availableOptions ?? [])
    .map((o) => Number.parseInt(o.id, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return {
    name: product.name,
    description: product.description ?? "",
    base_price: product.price,
    image_url: product.imageUrl ?? null,
    available: true,
    category_id: categoryId ?? null,
    drink_option_definition_ids,
  };
}

interface AppState {
  /**
   * Every product, whatever its category — one unfiltered load, the shape the
   * mobile client has always used. It replaced separate `drinks`/`desserts`
   * arrays, which were why meals could never be ordered on the web terminal.
   */
  products: Drink[];
  productsLoading: boolean;
  orders: ServerOrder[];
  draftItems: OrderItem[];
  loadProducts: () => Promise<void>;
  createProductApi: (product: Omit<Drink, "id">) => Promise<Drink>;
  updateProductApi: (id: string, product: Omit<Drink, "id">) => Promise<void>;
  deleteProductApi: (id: string) => Promise<void>;
  /**
   * Persist the running order products are shown in. Takes the whole sequence
   * of product ids, in the order the terminal and the menu should list them.
   */
  reorderProductsApi: (orderedIds: string[]) => Promise<void>;
  uploadProductImage: (productId: string, file: File) => Promise<string>;
  toggleProductAvailableApi: (id: string, active: boolean, hideUntilMidnight?: boolean) => Promise<void>;
  /** Replace the small-print note under the menu board; "" clears it. Admin only. */
  saveMenuNoteApi: (note: string) => Promise<string>;
  setOrders: (orders: ServerOrder[]) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  removeOrderItem: (orderId: number, itemId: number) => void;
  removeOrder: (orderId: number) => void;
  addDraftItem: (item: OrderItem) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  products: [],
  productsLoading: false,
  orders: [],
  draftItems: [],

  loadProducts: async () => {
    set(() => ({ productsLoading: true }));
    try {
      // One unfiltered request for every category. The old pair of
      // category-filtered loads is why meals existed in the database but were
      // unreachable from the web terminal.
      const data = await apiFetch<Record<string, unknown>[]>("/api/products");
      if (!Array.isArray(data) || data.length === 0) {
        // Keep the offline/empty menu working, as the drink load always has.
        set(() => ({ products: defaultDrinks, productsLoading: false }));
        return;
      }
      set(() => ({
        products: data.map((product) => mapApiProductToDrink(product)),
        productsLoading: false,
      }));
    } catch (_err) {
      set(() => ({ products: defaultDrinks, productsLoading: false }));
    }
  },

  createProductApi: async (product) => {
    const apiUrl = getApiBaseUrl();
    const categoryId = await resolveCategoryId(apiUrl, product);
    const categoryName = product.categoryName ?? PRODUCT_CATEGORY.DRINK;
    if (!categoryId) {
      throw new Error(t("errors.categoryMissing", { category: categoryName }));
    }
    const body = productToApiBody(product, categoryId);
    const data = await apiFetch<{ id?: string | number }>("/api/products", {
      method: "POST",
      body,
      auth: true,
      authError: t("errors.loginRequiredToCreateProducts"),
    });
    const id = String(data?.id ?? "");
    if (!id) throw new Error(t("errors.noProductId"));
    const categories = await fetchCategories(apiUrl);
    const categoryRow = categories.find((c) => c.id === categoryId);
    const isDrink = isProductCategory(categoryName, PRODUCT_CATEGORY.DRINK);
    const created: Drink = {
      ...product,
      id,
      categoryName,
      // Only a drink hangs off a subtype; for anything else the resolved row
      // *is* the top-level category.
      subtypeName: isDrink ? categoryRow?.name ?? product.subtypeName : undefined,
      categoryId,
    };
    set((state) => ({ products: [...state.products, created] }));
    return created;
  },

  updateProductApi: async (id, product) => {
    const apiUrl = getApiBaseUrl();
    const categoryId = await resolveCategoryId(apiUrl, product);
    const categoryName = product.categoryName ?? PRODUCT_CATEGORY.DRINK;
    if (!categoryId) {
      throw new Error(
        t("errors.categoryUnresolved", { category: categoryName })
      );
    }
    const body = productToApiBody(product, categoryId);
    await apiFetch(`/api/products/${id}`, {
      method: "PUT",
      body,
      auth: true,
      authError: t("errors.loginRequiredToUpdateProducts"),
    });
    const categories = await fetchCategories(apiUrl);
    const categoryRow = categories.find((c) => c.id === categoryId);
    const isDrink = isProductCategory(categoryName, PRODUCT_CATEGORY.DRINK);
    const updated: Drink = {
      ...product,
      id,
      categoryName,
      subtypeName: isDrink ? categoryRow?.name ?? product.subtypeName : undefined,
      categoryId,
    };
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deleteProductApi: async (id) => {
    await apiFetch(`/api/products/${id}`, {
      method: "DELETE",
      auth: true,
      authError: t("errors.loginRequiredToDeleteProducts"),
    });
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  saveMenuNoteApi: async (note) => {
    const saved = await apiFetch<{ note: string }>("/api/settings/menu-note", {
      method: "PUT",
      body: { note },
      auth: true,
      authError: t("errors.loginRequiredToUpdateProducts"),
    });
    return saved?.note ?? "";
  },

  reorderProductsApi: async (orderedIds) => {
    // Move the list locally first: the table this is driven from must not lag
    // a tap behind, and the API answers with nothing worth waiting for.
    const previous = get().products;
    const byId = new Map(previous.map((p) => [p.id, p]));
    const named = new Set(orderedIds);
    const moved = orderedIds
      .map((id) => byId.get(id))
      .filter((p): p is Drink => Boolean(p));
    const rest = previous.filter((p) => !named.has(p.id));
    set(() => ({ products: [...moved, ...rest] }));
    try {
      await apiFetch("/api/products/reorder", {
        method: "PUT",
        body: { ids: orderedIds.map((id) => Number(id)) },
        auth: true,
        authError: t("errors.loginRequiredToUpdateProducts"),
      });
    } catch (err) {
      // Put the old order back rather than leaving the screen showing a
      // sequence the server never accepted.
      set(() => ({ products: previous }));
      throw err;
    }
  },

  uploadProductImage: async (productId, file) => {
    const formData = new FormData();
    formData.append("image", file);
    const data = await apiFetch<{ image_url?: string }>(
      `/api/products/${productId}/image`,
      {
        method: "POST",
        formData,
        auth: true,
        authError: t("errors.loginRequiredToUploadImages"),
      }
    );
    const imageUrl = typeof data?.image_url === "string" ? data.image_url : "";
    if (!imageUrl) throw new Error(t("errors.noImageUrl"));
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, imageUrl } : p
      ),
    }));
    return imageUrl;
  },
  
  toggleProductAvailableApi: async (id, active, hideUntilMidnight) => {
    await apiFetch(`/api/products/${id}/availability`, {
      method: "PATCH",
      body: { available: active, hide_until_midnight: hideUntilMidnight ?? false },
      auth: true,
    });
    // available_until is non-null only for the temporary-hide case (value used only for the label)
    const available_until = !active && hideUntilMidnight ? "scheduled" : null;
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, active, available_until } : p
      ),
    }));
  },

  setOrders: (orders) => set(() => ({
    orders
  })),
  
  addDraftItem: (item) => set((state) => {
    const existingIndex = state.draftItems.findIndex((existing) => {
      return (
        existing.drinkId === item.drinkId &&
        areSelectedOptionsEqual(existing.selectedOptions, item.selectedOptions) &&
        (existing.comment ?? "") === (item.comment ?? "")
      );
    });
    if (existingIndex !== -1) {
      const updated = [...state.draftItems];
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + item.quantity
      };
      return { draftItems: updated };
    }
    return { draftItems: [...state.draftItems, item] };
  }),

  removeDraftItem: (itemId) => set((state) => ({
    draftItems: state.draftItems.filter((item) => item.id !== itemId)
  })),

  clearDraft: () => set(() => ({
    draftItems: []
  })),

  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map((order) =>
      order.id === orderId ? { ...order, status } : order
    )
  })),

  removeOrderItem: (orderId, itemId) => set((state) => ({
    orders: state.orders.map((order) => {
      if (order.id !== orderId) return order;
      const items = order.items.filter((i) => i.id !== itemId);
      const total = items.reduce(
        (sum, i) => sum + (Number(i.price) ?? 0) * (i.quantity ?? 1),
        0
      );
      return {
        ...order,
        items,
        total,
        status: items.length === 0 ? "cancelled" : order.status,
      };
    }),
  })),

  removeOrder: (orderId) => set((state) => ({
    orders: state.orders.filter((order) => order.id !== orderId),
  })),
}));

/** Products of one top-level category, for a menu section or a filter pill. */
export function productsInCategory(
  products: Drink[],
  category: ProductCategoryName
): Drink[] {
  return products.filter((p) => isProductCategory(p.categoryName, category));
}
