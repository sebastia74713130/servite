// === Enums ===
export type OrderStatus = 'sent' | 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type UserRole = 'owner' | 'admin' | 'kitchen' | 'waitstaff' | 'superadmin';
export type SubscriptionPlan = 'TEST' | 'BASIC' | 'PRO' | 'FULL' | 'CUSTOM';
export type OrderChannel = 'dine_in' | 'own_delivery' | 'third_party';
export type MacroCategory = 'food' | 'beverage' | 'dessert' | 'other';

export type ModuleKey = 
  | 'menu' 
  | 'tables' 
  | 'takeaway' 
  | 'orders' 
  | 'kitchen' 
  | 'accounts' 
  | 'orders&accounts'
  | 'orders&acounts'
  | 'invoices' 
  | 'inventory' 
  | 'finances' 
  | 'reservations' 
  | 'branches';

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  category: 'salon' | 'cocina' | 'caja' | 'gestion';
  description: string;
  routes: string[];
}

export const AVAILABLE_MODULES: Record<ModuleKey, ModuleDefinition> = {
  menu: {
    key: 'menu',
    name: 'Menú Digital',
    category: 'salon',
    description: 'Catálogo digital con fotos, categorías, modificadores y código QR.',
    routes: ['/menu', '/menu/design']
  },
  tables: {
    key: 'tables',
    name: 'Mesas & Salón',
    category: 'salon',
    description: 'Gestión de mesas, QR de mesa, llamados de mesero y cobro con QR dinámico en mesa.',
    routes: ['/tables']
  },
  takeaway: {
    key: 'takeaway',
    name: 'Barra & Takeaway',
    category: 'salon',
    description: 'Atención rápida en barra, captura de datos del cliente y aviso sonoro de pedido listo.',
    routes: ['/tables']
  },
  'orders&accounts': {
    key: 'orders&accounts',
    name: 'Mesas y Pedidos',
    category: 'salon',
    description: 'Control unificado de salón: cuadrícula de mesas, pedidos en tiempo real, estados de platos, cobro y liberación.',
    routes: ['/accounts', '/orders']
  },
  'orders&acounts': {
    key: 'orders&acounts',
    name: 'Mesas y Pedidos',
    category: 'salon',
    description: 'Control unificado de salón: cuadrícula de mesas, pedidos en tiempo real, estados de platos, cobro y liberación.',
    routes: ['/accounts', '/orders']
  },
  orders: {
    key: 'orders',
    name: 'Gestión de Pedidos',
    category: 'salon',
    description: 'Bandeja en tiempo real de órdenes de salón o barra y asignación a mozos.',
    routes: ['/orders']
  },
  kitchen: {
    key: 'kitchen',
    name: 'Cocina & KDS',
    category: 'cocina',
    description: 'Pantalla de cocina táctil en vivo con separación por estaciones y alertas sonoras.',
    routes: ['/kitchen']
  },
  accounts: {
    key: 'accounts',
    name: 'Caja & Cuentas',
    category: 'caja',
    description: 'Cierre de cuentas de mesas, cobros en efectivo/tarjeta/QR y liberación de mesa.',
    routes: ['/accounts']
  },
  invoices: {
    key: 'invoices',
    name: 'Facturación SIAT',
    category: 'caja',
    description: 'Facturación electrónica computarizada en línea validada por Impuestos Nacionales.',
    routes: ['/invoices', '/settings/siat']
  },
  finances: {
    key: 'finances',
    name: 'Finanzas & Arqueos',
    category: 'caja',
    description: 'Cajas chicas, aperturas/cierres de turno, ingresos, egresos y reportes.',
    routes: ['/finances']
  },
  inventory: {
    key: 'inventory',
    name: 'Inventario & Costeo',
    category: 'gestion',
    description: 'Insumos, recetas, cálculo de Food Cost y descuento automático de stock con cada venta.',
    routes: ['/inventory']
  },
  reservations: {
    key: 'reservations',
    name: 'Reservas Online',
    category: 'gestion',
    description: 'Página web pública de reservas de mesa por turnos y confirmación de asistencia.',
    routes: ['/reservations', '/settings/reservations']
  },
  branches: {
    key: 'branches',
    name: 'Múltiples Sucursales',
    category: 'gestion',
    description: 'Administración centralizada de más de un local o sucursal de la marca.',
    routes: ['/branches']
  }
};

export const PRESET_MODULE_PLANS: Record<string, { name: string; modules: ModuleKey[] }> = {
  MENU_ONLY: {
    name: 'Plan Menú Digital',
    modules: ['menu']
  },
  BASIC: {
    name: 'Plan Menú & Barra',
    modules: ['menu', 'takeaway', 'orders']
  },
  DINE_IN: {
    name: 'Plan Salón & Mesas',
    modules: ['menu', 'tables', 'orders', 'kitchen', 'accounts']
  },
  STANDARD: {
    name: 'Plan Operativo Completo',
    modules: ['menu', 'tables', 'takeaway', 'orders', 'kitchen', 'accounts', 'finances']
  },
  FULL: {
    name: 'Plan Total (Todo Incluido)',
    modules: ['menu', 'tables', 'takeaway', 'orders', 'kitchen', 'accounts', 'invoices', 'inventory', 'finances', 'reservations', 'branches']
  }
};

// === Database Models ===
export interface PlatformAdmin {
  id: string;
  user_id: string;
  email: string;
  full_name?: string | null;
  role: 'superadmin' | 'support';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingCycle {
  id: string;
  restaurant_id: string;
  start_date: string;
  end_date: string;
  ticket_count: number;
  limit_exceeded: boolean;
}
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: 'active' | 'inactive' | 'expired' | 'suspended';
  subscription_expires_at?: string | null;
  subscription_notes?: string | null;
  monthly_price?: number;
  billing_period?: 'monthly' | 'semiannual' | 'annual';
  enabled_modules?: ModuleKey[];
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
  type?: 'dine_in' | 'takeaway';
  service_status?: string | null;
  siat_customer_nit?: string | null;
  siat_customer_name?: string | null;
  siat_customer_email?: string | null;
  requested_payment_method?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  macro_category: MacroCategory;
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
  table_id?: string | null;
  table_number?: string | null;
  order_channel: OrderChannel;
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
