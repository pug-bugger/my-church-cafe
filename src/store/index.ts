import { create } from 'zustand';
import { Drink, OrderItem, ServerOrder, OrderStatus } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';

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

interface AppState {
  drinks: Drink[];
  orders: ServerOrder[];
  draftItems: OrderItem[];
  addDrink: (drink: Drink) => void;
  updateDrink: (id: string, drink: Partial<Drink>) => void;
  deleteDrink: (id: string) => void;
  loadDrinks: () => Promise<void>;
  setOrders: (orders: ServerOrder[]) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  addDraftItem: (item: OrderItem) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  drinks: defaultDrinks,
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
      set(() => ({ drinks: defaultDrinks }));
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/products`);
      if (!response.ok) {
        throw new Error("Failed to load products");
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        set(() => ({ drinks: defaultDrinks }));
        return;
      }
      const mapped: Drink[] = data.map((product) => ({
        id: String(product.id),
        name: product.name ?? "Unnamed",
        secondaryName: product.category_name ?? undefined,
        description: product.description ?? "",
        price: Number(product.base_price ?? 0),
        imageUrl: product.image_url ?? undefined,
        availableOptions: [],
      }));
      set(() => ({ drinks: mapped }));
    } catch (_err) {
      set(() => ({ drinks: defaultDrinks }));
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
