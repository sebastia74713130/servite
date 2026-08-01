export const COLORS = {
  white: '#FFFFFF',
  terracotta: '#E76F51',
  terracottaLight: '#F4A98A',
  oliveGreen: '#2F4F3E',
  oliveGreenLight: '#4A7A63',
  textPrimary: '#1F2933',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  backgroundLight: '#F9FAFB',
  gold: '#F4B942',
  success: '#2E7D32',
  error: '#D64545',
} as const;

export const ORDER_STATUS_LABELS_CLIENT: Record<string, string> = {
  sent: 'Enviado',
  received: 'Recibido',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_LABELS_RESTAURANT: Record<string, string> = {
  sent: 'Nuevo',
  received: 'Recibido',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  sent: '#3B82F6',
  received: '#F4B942',
  preparing: '#E76F51',
  ready: '#2E7D32',
  delivered: '#6B7280',
  cancelled: '#D64545',
};

export const ORDER_STATUS_SEQUENCE = ['sent', 'received', 'preparing', 'ready', 'delivered'] as const;

export const NEXT_STATUS: Record<string, string> = {
  sent: 'preparing',
  received: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export const NEXT_STATUS_ACTION_LABEL: Record<string, string> = {
  sent: 'Presione para activar en preparación',
  received: 'Presione para activar en preparación',
  preparing: 'Seleccione listo al terminar',
  ready: 'Marcar entregado',
};

// Demo data IDs
export const DEMO = {
  RESTAURANT_ID: '00000000-0000-0000-0000-000000000001',
  BRANCH_ID: '00000000-0000-0000-0000-000000000002',
} as const;
