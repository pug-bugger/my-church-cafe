import { create } from 'zustand';
import { Drink, Order, OrderItem } from '@/types';
import { defaultDrinks } from '@/data/defaultDrinks';

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
      id: crypto.randomUUID(),
      items,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return {
      orders: [...state.orders, newOrder]
    };
  }),
  
  addDraftItem: (item) => set((state) => ({
    draftItems: [...state.draftItems, item]
  })),

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
      id: crypto.randomUUID(),
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
