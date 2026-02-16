export type DrinkOption = {
  id: string;
  name: string;
  type: 'sugar' | 'temperature' | 'size' | 'custom' | 'checkbox';
  values: string[];
  defaultValue?: string | boolean;
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

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'paid'
  | 'cancelled'
  | 'completed';

export type ServerOrderItem = {
  id: number;
  order_id: number;
  product_item_id: number | null;
  quantity: number;
  price: number | null;
  product_item_name: string | null;
};

export type ServerOrder = {
  id: number;
  order_number?: number;
  user_id: number | null;
  total: number | null;
  status: OrderStatus;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  items: ServerOrderItem[];
};
