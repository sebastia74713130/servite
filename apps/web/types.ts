export type OrderStatus = 'sent' | 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface Table {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_number: string;
  table_code: string;
  qr_url: string | null;
  type?: 'dine_in' | 'takeaway';
  is_active: boolean;
}

export interface Category {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  restaurant_id: string;
  branch_id: string;
  category_id: string;
  station_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  preparation_time_minutes: number | null;
  sort_order: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  branch_id: string;
  table_id: string;
  table_number: string;
  customer_session_id: string | null;
  status: OrderStatus;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  station_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export interface KitchenStation {
  id: string;
  restaurant_id: string;
  name: string;
  is_active: boolean;
}
