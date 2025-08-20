import { create } from 'zustand';
import { Drink, Order, OrderItem } from '@/types';

interface AppState {
  drinks: Drink[];
  orders: Order[];
  addDrink: (drink: Drink) => void;
  updateDrink: (id: string, drink: Partial<Drink>) => void;
  deleteDrink: (id: string) => void;
  createOrder: (items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  drinks: [],
  orders: [],
  
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
  
  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map((order) =>
      order.id === orderId
        ? { ...order, status, updatedAt: new Date() }
        : order
    )
  }))
}));
