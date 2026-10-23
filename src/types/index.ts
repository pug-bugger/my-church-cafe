/** One choice of a select-style option, with what picking it adds to the line. */
export type DrinkOptionValue = {
  /** `drink_option_values.id` — what a "sold out" toggle is sent against. */
  id?: number;
  /**
   * The canonical English label — what the order sends and the kitchen ticket
   * prints. `labelLt` / `labelRu` are display-only translations.
   */
  label: string;
  labelLt?: string;
  labelRu?: string;
  /** Surcharge in euros; 0 for most choices. */
  extraPrice: number;
  /** Sold out until this moment (ISO); absent or null when it can be picked. */
  unavailableUntil?: string | null;
};

export type DrinkOption = {
  id: string;
  /** Canonical English name, as printed on the ticket; translations below. */
  name: string;
  nameLt?: string;
  nameRu?: string;
  type: 'sugar' | 'temperature' | 'size' | 'custom' | 'checkbox';
  /** Choices for select-style options; empty for checkbox-only options */
  values: DrinkOptionValue[];
  /** Surcharge added when a checkbox-style option is ticked. */
  checkboxExtraPrice?: number;
  defaultValue?: string | boolean;
  /**
   * Checkbox options only: sold out until this moment (ISO), so it can't be
   * ticked. A picklist is never sold out as a whole — its values are.
   */
  unavailableUntil?: string | null;
};

export type Drink = {
  id: string;
  name: string;
  nameLt?: string;
  nameRu?: string;
  secondaryName?: string;
  /** Top-level type: Drink, Dessert, Meal */
  categoryName?: string;
  /** Drink subtype when category is Drink (e.g. Coffee, Season drinks) */
  subtypeName?: string;
  /** categories.id used for API create/update */
  categoryId?: number;
  description: string;
  price: number;
  imageUrl?: string;
  iconName?: string;
  availableOptions: DrinkOption[];
  /**
   * false means not on sale. With `available_until` set it is only sold out
   * until then — shown greyed out on the menu and the terminal; without it,
   * hidden from both (see `productAvailability` in `@/lib/availability`).
   */
  active?: boolean;
  /**
   * Position in the cafe's hand-picked running order (`products.sort_order`).
   * The API already returns rows in it, so this is here for the Manage table's
   * move up / move down, not for re-sorting on the client.
   */
  sortOrder?: number;
  /** ISO datetime until which the product is sold out; null means permanent or not hidden */
  available_until?: string | null;
};

export type OrderItem = {
  id: string;
  drinkId: string;
  selectedOptions: {
    [key: string]: string;
  };
  quantity: number;
  comment?: string;
};

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'paid'
  | 'cancelled'
  | 'completed';

/** One saved drink option on a line item (from API: order_item_options). */
export type ServerOrderItemOption = {
  id: number;
  option_definition_name: string | null;
  option_value_name: string | null;
};

export type ServerOrderItem = {
  id: number;
  order_id: number;
  product_item_id: number | null;
  quantity: number;
  price: number | null;
  product_item_name: string | null;
  category_name?: string | null;
  product_item_options?: ServerOrderItemOption[];
  comment?: string | null;
};

/** User row from `/api/users` or `/api/users/me` */
export type ServerUser = {
  id: number;
  name: string;
  email: string;
  picture_url: string | null;
  role: string | null;
  created_at?: string;
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
  comment?: string | null;
  customer_name?: string | null;
  items: ServerOrderItem[];
};
