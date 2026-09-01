import { create } from 'zustand';
import { Drink, OrderItem, ServerOrder, OrderStatus } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';
import { mapProductApiToDrinkOptions } from '@/lib/drinkOptions';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import {
  fetchCategories,
  findSubtypeByName,
  getCategoryId,
  getDrinkParentCategory,
  isProductCategory,
  PRODUCT_CATEGORY,
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
    name: String(product.name ?? "Unnamed"),
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
  };
}

async function resolveDrinkCategoryId(
  apiUrl: string,
  drink: Omit<Drink, "id">
): Promise<number | undefined> {
  const categories = await fetchCategories(apiUrl);
  if (drink.categoryId != null) {
    const match = categories.find((c) => c.id === drink.categoryId);
    if (match) return match.id;
  }
  const fromSubtype = findSubtypeByName(categories, drink.subtypeName);
  if (fromSubtype) return fromSubtype.id;
  const drinkParent = getDrinkParentCategory(categories);
  return drinkParent?.id;
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
  drinks: Drink[];
  drinksLoading: boolean;
  desserts: Drink[];
  dessertsLoading: boolean;
  orders: ServerOrder[];
  draftItems: OrderItem[];
  addDrink: (drink: Drink) => void;
  updateDrink: (id: string, drink: Partial<Drink>) => void;
  deleteDrink: (id: string) => void;
  loadDrinks: () => Promise<void>;
  loadDesserts: () => Promise<void>;
  createDrinkApi: (drink: Omit<Drink, "id">) => Promise<Drink>;
  updateDrinkApi: (id: string, drink: Omit<Drink, "id">) => Promise<void>;
  deleteDrinkApi: (id: string) => Promise<void>;
  createDessertApi: (dessert: Omit<Drink, "id">) => Promise<Drink>;
  updateDessertApi: (id: string, dessert: Omit<Drink, "id">) => Promise<void>;
  deleteDessertApi: (id: string) => Promise<void>;
  uploadProductImage: (productId: string, file: File) => Promise<string>;
  toggleProductAvailableApi: (id: string, active: boolean, hideUntilMidnight?: boolean) => Promise<void>;
  setOrders: (orders: ServerOrder[]) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  removeOrderItem: (orderId: number, itemId: number) => void;
  removeOrder: (orderId: number) => void;
  addDraftItem: (item: OrderItem) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  drinks: [],
  drinksLoading: false,
  desserts: [],
  dessertsLoading: false,
  orders: [],
  draftItems: [],
  
  addDrink: (drink) => set((state) => ({
    drinks: [...state.drinks, drink]
  })),
  
  updateDrink: (id, updatedDrink) => set((state) => ({
    drinks: state.drinks.map((drink) => 
      drink.id === id ? { ...drink, ...updatedDrink } : drink
    )
  })),
  
  deleteDrink: (id) => set((state) => ({
    drinks: state.drinks.filter((drink) => drink.id !== id)
  })),

  loadDrinks: async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
      return;
    }
    set(() => ({ drinksLoading: true }));
    try {
      const categories = await fetchCategories(apiUrl);
      const drinkParent = getDrinkParentCategory(categories);
      const path = drinkParent
        ? `/api/products?parent_category_id=${drinkParent.id}`
        : `/api/products`;
      const data = await apiFetch<Record<string, unknown>[]>(path);
      if (!Array.isArray(data) || data.length === 0) {
        set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
        return;
      }
      const mapped = data.map((product) => mapApiProductToDrink(product));
      set(() => ({ drinks: mapped, drinksLoading: false }));
    } catch (_err) {
      set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
    }
  },

  loadDesserts: async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      set(() => ({ desserts: [], dessertsLoading: false }));
      return;
    }
    set(() => ({ dessertsLoading: true }));
    try {
      const categoryIds = await fetchCategories(apiUrl).then((rows) => {
        const map = new Map<string, number>();
        for (const row of rows) {
          map.set(row.name.trim().toLowerCase(), row.id);
        }
        return map;
      });
      const dessertCategoryId = getCategoryId(
        categoryIds,
        PRODUCT_CATEGORY.DESSERT
      );
      if (!dessertCategoryId) {
        set(() => ({ desserts: [], dessertsLoading: false }));
        return;
      }
      const data = await apiFetch<Record<string, unknown>[]>(
        `/api/products?category_id=${dessertCategoryId}`
      );
      const mapped = Array.isArray(data)
        ? data.map((product) => mapApiProductToDrink(product))
        : [];
      set(() => ({ desserts: mapped, dessertsLoading: false }));
    } catch (_err) {
      set(() => ({ desserts: [], dessertsLoading: false }));
    }
  },

  createDrinkApi: async (drink) => {
    const apiUrl = getApiBaseUrl();
    const categoryId = await resolveDrinkCategoryId(apiUrl, drink);
    if (!categoryId) {
      throw new Error(
        "Drink category is missing. Run migration_drink_subtypes.sql and assign a subtype."
      );
    }
    const body = productToApiBody(drink, categoryId);
    const data = await apiFetch<{ id?: string | number }>("/api/products", {
      method: "POST",
      body,
      auth: true,
      authError: "Login required to create drinks",
    });
    const id = String(data?.id ?? "");
    if (!id) throw new Error("Server did not return product id");
    const categories = await fetchCategories(apiUrl);
    const subtypeRow = categories.find((c) => c.id === categoryId);
    const created: Drink = {
      ...drink,
      id,
      categoryName: PRODUCT_CATEGORY.DRINK,
      subtypeName: subtypeRow?.name ?? drink.subtypeName,
      categoryId,
    };
    set((state) => ({ drinks: [...state.drinks, created] }));
    return created;
  },

  updateDrinkApi: async (id, drink) => {
    const apiUrl = getApiBaseUrl();
    const categoryId = await resolveDrinkCategoryId(apiUrl, drink);
    if (!categoryId) {
      throw new Error("Could not resolve drink subtype category.");
    }
    const body = productToApiBody(drink, categoryId);
    await apiFetch(`/api/products/${id}`, {
      method: "PUT",
      body,
      auth: true,
      authError: "Login required to update drinks",
    });
    const categories = await fetchCategories(apiUrl);
    const subtypeRow = categories.find((c) => c.id === categoryId);
    const updated: Drink = {
      ...drink,
      id,
      categoryName: PRODUCT_CATEGORY.DRINK,
      subtypeName: subtypeRow?.name ?? drink.subtypeName,
      categoryId,
    };
    set((state) => ({
      drinks: state.drinks.map((d) => (d.id === id ? updated : d)),
    }));
  },

  deleteDrinkApi: async (id) => {
    await apiFetch(`/api/products/${id}`, {
      method: "DELETE",
      auth: true,
      authError: "Login required to delete drinks",
    });
    set((state) => ({
      drinks: state.drinks.filter((d) => d.id !== id),
    }));
  },

  createDessertApi: async (dessert) => {
    const apiUrl = getApiBaseUrl();
    const categories = await fetchCategories(apiUrl);
    const map = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c.id])
    );
    const categoryId = getCategoryId(map, PRODUCT_CATEGORY.DESSERT);
    if (!categoryId) {
      throw new Error(
        "Dessert category is missing in the database. Run the dessert category migration."
      );
    }
    const body = productToApiBody(
      { ...dessert, availableOptions: [] },
      categoryId
    );
    const data = await apiFetch<{ id?: string | number }>("/api/products", {
      method: "POST",
      body,
      auth: true,
      authError: "Login required to create desserts",
    });
    const id = String(data?.id ?? "");
    if (!id) throw new Error("Server did not return product id");
    const created: Drink = {
      ...dessert,
      id,
      availableOptions: [],
      categoryName: PRODUCT_CATEGORY.DESSERT,
    };
    set((state) => ({ desserts: [...state.desserts, created] }));
    return created;
  },

  updateDessertApi: async (id, dessert) => {
    const apiUrl = getApiBaseUrl();
    const categories = await fetchCategories(apiUrl);
    const map = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c.id])
    );
    const categoryId = getCategoryId(map, PRODUCT_CATEGORY.DESSERT);
    const body = productToApiBody(
      { ...dessert, availableOptions: [] },
      categoryId
    );
    await apiFetch(`/api/products/${id}`, {
      method: "PUT",
      body,
      auth: true,
      authError: "Login required to update desserts",
    });
    const updated: Drink = {
      ...dessert,
      id,
      availableOptions: [],
      categoryName: PRODUCT_CATEGORY.DESSERT,
    };
    set((state) => ({
      desserts: state.desserts.map((d) => (d.id === id ? updated : d)),
    }));
  },

  deleteDessertApi: async (id) => {
    await apiFetch(`/api/products/${id}`, {
      method: "DELETE",
      auth: true,
      authError: "Login required to delete desserts",
    });
    set((state) => ({
      desserts: state.desserts.filter((d) => d.id !== id),
    }));
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
        authError: "Login required to upload images",
      }
    );
    const imageUrl = typeof data?.image_url === "string" ? data.image_url : "";
    if (!imageUrl) throw new Error("Server did not return image_url");
    set((state) => ({
      drinks: state.drinks.map((d) =>
        d.id === productId ? { ...d, imageUrl } : d
      ),
      desserts: state.desserts.map((d) =>
        d.id === productId ? { ...d, imageUrl } : d
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
      drinks: state.drinks.map((d) =>
        d.id === id ? { ...d, active, available_until } : d
      ),
      desserts: state.desserts.map((d) =>
        d.id === id ? { ...d, active, available_until } : d
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

/** Drinks and desserts available for terminal ordering. */
export function getOrderableProducts(state: {
  drinks: Drink[];
  desserts: Drink[];
}): Drink[] {
  return [...state.drinks, ...state.desserts];
}
