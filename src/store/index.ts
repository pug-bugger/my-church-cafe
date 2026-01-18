import { create } from 'zustand';
import { Drink, Order, OrderItem } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';
import { generateId } from '@/lib/utils';

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
  orders: Order[];
  draftItems: OrderItem[];
  addDrink: (drink: Drink) => void;
  updateDrink: (id: string, drink: Partial<Drink>) => void;
  deleteDrink: (id: string) => void;
  createOrder: (items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addDraftItem: (item: OrderItem) => void;
  removeDraftItem: (itemId: string) => void;
  clearDraft: () => void;
  confirmDraftOrder: () => void;
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
  
  createOrder: (items) => set((state) => {
    const newOrder: Order = {
      id: generateId(),
      items,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return {
      orders: [...state.orders, newOrder]
    };
  }),
  
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

  confirmDraftOrder: () => set((state) => {
    if (state.draftItems.length === 0) {
      return {};
    }
    const newOrder: Order = {
      id: generateId(),
      items: state.draftItems,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return {
      orders: [...state.orders, newOrder],
      draftItems: []
    };
  }),
  
  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map((order) =>
      order.id === orderId
        ? { ...order, status, updatedAt: new Date() }
        : order
    )
  }))
}));
