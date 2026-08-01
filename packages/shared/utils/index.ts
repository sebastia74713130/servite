export function formatPrice(price: number): string {
  return `Bs ${Number(price).toFixed(0)}`;
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateShortOrderCode(orderId: string): string {
  return `#${orderId.substring(0, 4).toUpperCase()}`;
}

export function formatKitchenTicket(order: {
  table_number: string;
  id: string;
  created_at: string;
  order_items?: Array<{ quantity: number; product_name: string; notes?: string | null }>;
  total: number;
  restaurant_name?: string;
  branch_name?: string;
}): string {
  const time = new Date(order.created_at).toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const code = order.id.substring(0, 4).toUpperCase();

  let ticket = `SERVIDO\n`;
  ticket += `${order.restaurant_name || 'Restaurante'} - ${order.branch_name || 'Sucursal'}\n\n`;
  ticket += `MESA: ${order.table_number}\n`;
  ticket += `PEDIDO: ${code}\n`;
  ticket += `HORA: ${time}\n\n`;

  for (const item of order.order_items || []) {
    ticket += `${item.quantity}x ${item.product_name}\n`;
    if (item.notes) ticket += `Nota: ${item.notes}\n`;
  }

  ticket += `\nTOTAL: Bs ${order.total}\n`;
  return ticket;
}

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${Math.floor(diffHours / 24)}d`;
}
