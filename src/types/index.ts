export type DrinkOption = {
  id: string;
  name: string;
  type: 'sugar' | 'temperature' | 'size' | 'custom';
  values: string[];
};

export type Drink = {
  id: string;
  name: string;
  secondaryName?: string;
  description: string;
  price: number;
  imageUrl?: string;
  iconName?: string;
  availableOptions: DrinkOption[];
};

export type OrderItem = {
  id: string;
  drinkId: string;
  selectedOptions: {
    [key: string]: string;
  };
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  createdAt: Date;
  updatedAt: Date;
};
