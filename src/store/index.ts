import { create } from 'zustand';
import { Drink, OrderItem, ServerOrder, OrderStatus } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';
import { mapProductApiToDrinkOptions } from '@/lib/drinkOptions';

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

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ??
    localStorage.getItem("jwt") ??
    localStorage.getItem("accessToken")
  );
}

/** Map frontend Drink (without id) to backend POST/PUT /api/products body. */
function drinkToProductBody(drink: Omit<Drink, "id">) {
  const drink_option_definition_ids = (drink.availableOptions ?? [])
    .map((o) => Number.parseInt(o.id, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return {
    name: drink.name,
    description: drink.description ?? "",
    base_price: drink.price,
    image_url: drink.imageUrl ?? null,
    available: true,
    drink_option_definition_ids,
  };
}

interface AppState {
  drinks: Drink[];
  drinksLoading: boolean;
  orders: ServerOrder[];
  draftItems: OrderItem[];
  addDrink: (drink: Drink) => void;
  updateDrink: (id: string, drink: Partial<Drink>) => void;
  deleteDrink: (id: string) => void;
  loadDrinks: () => Promise<void>;
  createDrinkApi: (drink: Omit<Drink, "id">) => Promise<Drink>;
  updateDrinkApi: (id: string, drink: Omit<Drink, "id">) => Promise<void>;
  deleteDrinkApi: (id: string) => Promise<void>;
  uploadProductImage: (productId: string, file: File) => Promise<string>;
  setOrders: (orders: ServerOrder[]) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  addDraftItem: (item: OrderItem) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  drinks: [],
  drinksLoading: false,
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

  createDrinkApi: async (drink) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const token = getAuthToken();
    if (!token) throw new Error("Login required to create drinks");
    const body = drinkToProductBody(drink);
    const response = await fetch(`${apiUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to create drink");
    }
    const id = String(data?.id ?? "");
    if (!id) throw new Error("Server did not return product id");
    const created: Drink = { ...drink, id };
    set((state) => ({ drinks: [...state.drinks, created] }));
    return created;
  },

  updateDrinkApi: async (id, drink) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const token = getAuthToken();
    if (!token) throw new Error("Login required to update drinks");
    const body = drinkToProductBody(drink);
    const response = await fetch(`${apiUrl}/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to update drink");
    }
    const updated: Drink = { ...drink, id };
    set((state) => ({
      drinks: state.drinks.map((d) => (d.id === id ? updated : d)),
    }));
  },

  deleteDrinkApi: async (id) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const token = getAuthToken();
    if (!token) throw new Error("Login required to delete drinks");
    const response = await fetch(`${apiUrl}/api/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Failed to delete drink");
    }
    set((state) => ({
      drinks: state.drinks.filter((d) => d.id !== id),
    }));
  },

  uploadProductImage: async (productId, file) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
    const token = getAuthToken();
    if (!token) throw new Error("Login required to upload images");
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${apiUrl}/api/products/${productId}/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error ?? "Failed to upload image");
    }
    const imageUrl = typeof data?.image_url === "string" ? data.image_url : "";
    if (!imageUrl) throw new Error("Server did not return image_url");
    set((state) => ({
      drinks: state.drinks.map((d) =>
        d.id === productId ? { ...d, imageUrl } : d
      ),
    }));
    return imageUrl;
  },

  loadDrinks: async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
      return;
    }
    set(() => ({ drinksLoading: true }));
    try {
      const response = await fetch(`${apiUrl}/api/products`);
      if (!response.ok) {
        throw new Error("Failed to load products");
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
        return;
      }
      const mapped: Drink[] = data.map((product) => ({
        id: String(product.id),
        name: product.name ?? "Unnamed",
        secondaryName: product.category_name ?? undefined,
        description: product.description ?? "",
        price: Number(product.base_price ?? 0),
        imageUrl: product.image_url ?? undefined,
        availableOptions: mapProductApiToDrinkOptions(product.drink_options),
      }));
      set(() => ({ drinks: mapped, drinksLoading: false }));
    } catch (_err) {
      set(() => ({ drinks: defaultDrinks, drinksLoading: false }));
    }
  },
  
  setOrders: (orders) => set(() => ({
    orders
  })),
  
  addDraftItem: (item) => set((state) => {
    const existingIndex = state.draftItems.findIndex((existing) => {
      return (
        existing.drinkId === item.drinkId &&
        areSelectedOptionsEqual(existing.selectedOptions, item.selectedOptions)
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
  }))
}));
