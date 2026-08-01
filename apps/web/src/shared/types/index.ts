// === Enums ===
export type OrderStatus = 'sent' | 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type UserRole = 'owner' | 'admin' | 'kitchen';

// === Database Models ===
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color?: string | null;
  cover_url?: string | null;
  menu_background_color?: string | null;
  menu_background_image_url?: string | null;
  menu_text_color?: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_number: string;
  table_code: string;
  qr_url: string | null;
  service_status?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KitchenStation {
  id: string;
  restaurant_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  background_color?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  page_background_color?: string | null;
  page_text_color?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subsection {
  id: string;
  category_id: string;
  name: string;
  background_color?: string | null;
  text_color?: string | null;
  image_url?: string | null;
  typography?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  branch_id: string;
  category_id: string;
  subsection_id?: string | null;
  station_id?: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  card_background_color?: string | null;
  card_text_color?: string | null;
  is_available: boolean;
  is_active: boolean;
  preparation_time_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_number: string;
  customer_session_id: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_paid?: boolean;
  payment_method?: string | null;
  cash_register_id?: string | null;
  paid_at?: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  station_id?: string | null;
  created_at: string;
}

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
  user_id: string;
  role: UserRole;
  created_at: string;
}

// === Inventory & Finances Types ===

export interface CashRegister {
  id: string;
  restaurant_id: string;
  branch_id: string;
  status: 'open' | 'closed';
  opening_balance: number;
  closing_balance: number | null;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  restaurant_id: string;
  branch_id: string;
  cash_register_id: string | null;
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  registered_by: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  is_active: boolean;
  is_compound?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  inventory_item_id: string;
  quantity_required: number;
  created_at: string;
}

export interface InventoryItemRecipe {
  id: string;
  parent_item_id: string;
  ingredient_item_id: string;
  quantity_required: number;
  created_at: string;
}

export interface PurchaseList {
  id: string;
  restaurant_id: string;
  branch_id: string;
  supplier_name: string | null;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  total_cost: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PurchaseListItem {
  id: string;
  purchase_list_id: string;
  inventory_item_id: string;
  quantity_needed: number;
  unit_cost: number | null;
  is_received: boolean;
  created_at: string;
}

// === Cart Types (Client-side only) ===
export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  image_url: string | null;
}

export interface CartState {
  restaurant_id: string | null;
  branch_id: string | null;
  table_id: string | null;
  table_number: string | null;
  restaurant_name: string | null;
  branch_name: string | null;
  items: CartItem[];
}

// === Table Resolution (from QR/code) ===
export interface TableResolution {
  table: RestaurantTable;
  restaurant: Restaurant;
  branch: Branch;
}
