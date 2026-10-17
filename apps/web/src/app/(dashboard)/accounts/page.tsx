'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { TableQrModal } from '@/components/TableQrModal';
import { NewTableModal } from '@/components/NewTableModal';
import {
  Receipt,
  HandPlatter,
  X,
  CheckCircle,
  AlertCircle,
  Plus,
  QrCode,
  Clock,
  ArrowLeft,
  Trash2,
  ChefHat,
  Loader2,
  BellRing,
  UtensilsCrossed,
  CheckCircle2
} from 'lucide-react';
import { RestaurantTable, OrderStatus } from '@shared/types';
import { useOrders } from '@/hooks/useOrders';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { KanbanCard, FlatOrderItem } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

// Module-level caches to avoid re-fetching on navigation between sections
let cachedTables: RestaurantTable[] | null = null;
let cachedActiveRegister: any = null;

export default function AccountsPage() {
  const { restaurant, branch, loading: sessionLoading, hasModule } = useRestaurantSession();
  const hasInvoices = hasModule('invoices');
  const { orders, refreshOrders } = useOrders(restaurant?.id, branch?.id, { onlyUnpaid: true });
  const [tables, setTables] = useState<RestaurantTable[]>(cachedTables || []);
  const [loading, setLoading] = useState(!cachedTables);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Modal steps: 'details' (order strips & statuses) | 'checkout' (payment & release)
  const [modalStep, setModalStep] = useState<'details' | 'checkout'>('details');

  // Submodals
  const [showTableQr, setShowTableQr] = useState(false);
  const [showNewTableModal, setShowNewTableModal] = useState(false);

  // For the active bill in the modal
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [isClosingBill, setIsClosingBill] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // DnD state & sensors
  const [activeDraggedItem, setActiveDraggedItem] = useState<FlatOrderItem | null>(null);
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const sensors = useSensors(pointerSensor);

  // Table grid filters
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'new_orders' | 'occupied' | 'free' | 'calling'>('all');
  const [isStartingPrep, setIsStartingPrep] = useState(false);

  const [siatResult, setSiatResult] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    cuf?: string;
  } | null>(null);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState('Pago QR');
  const [cardNumber, setCardNumber] = useState('');
  const [siatPuntoVenta, setSiatPuntoVenta] = useState('0');
  const [cashierNit, setCashierNit] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [activeRegister, setActiveRegister] = useState<any>(cachedActiveRegister);

  useEffect(() => {
    if (restaurant?.id) {
      fetchTables();

      // Subscribe to table changes (for service_status updates)
      const tablesSub = supabase
        .channel(`public:tables_${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload: any) => {
          fetchTables();
          if (payload.new) {
            if (payload.new.service_status === 'paid_qr' && payload.old?.service_status !== 'paid_qr') {
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(() => {});
              } catch (e) {}
            }
            if (selectedTable && payload.new.id === selectedTable.id) {
              setSelectedTable(payload.new);
              if (payload.new.service_status === 'paid_qr') {
                fetchTableBill(payload.new.id, false, true);
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(tablesSub);
      };
    }
  }, [restaurant?.id, branch?.id, selectedTable?.id]);

  useEffect(() => {
    if (selectedTable) {
      setModalStep('details');
      const isPaid = selectedTable.service_status === 'paid_qr' || selectedTable.requested_payment_method === 'Pago QR';
      if (isPaid) {
        fetchTableBill(selectedTable.id, false, true);
      } else {
        const cached = orders.filter(
          (o) => o.table_id === selectedTable.id && o.status !== 'cancelled' && !o.is_paid
        );
        if (cached.length > 0) {
          setTableOrders(cached);
          fetchTableBill(selectedTable.id, true, false);
        } else {
          fetchTableBill(selectedTable.id, false, false);
        }
      }
    }
  }, [selectedTable]);

  // Keep open table orders in sync with Realtime useOrders updates
  useEffect(() => {
    const isPaid = selectedTable?.service_status === 'paid_qr' || selectedTable?.requested_payment_method === 'Pago QR';
    if (selectedTable && !isPaid) {
      const liveOrders = orders.filter(
        (o) => o.table_id === selectedTable.id && o.status !== 'cancelled' && !o.is_paid
      );
      setTableOrders(liveOrders);
    }
  }, [orders, selectedTable?.id, selectedTable?.service_status, selectedTable?.requested_payment_method]);

  useEffect(() => {
    if (selectedTable?.requested_payment_method) {
      setPaymentMethod(selectedTable.requested_payment_method);
    } else {
      setPaymentMethod('Pago QR');
    }

    if (hasInvoices && (selectedTable?.siat_customer_nit || selectedTable?.siat_customer_name)) {
      setCashierNit(selectedTable.siat_customer_nit || '');
      setCashierName(selectedTable.siat_customer_name || '');
      setGenerateInvoice(true);
    } else {
      setCashierNit('');
      setCashierName('');
      setGenerateInvoice(false);
    }
  }, [selectedTable, hasInvoices]);

  useEffect(() => {
    if (restaurant?.id) {
      fetchActiveRegister();
    }
  }, [restaurant?.id]);

  const fetchTables = async () => {
    if (!restaurant) return;
    try {
      let query = supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurant.id);

      if (branch) {
        query = query.eq('branch_id', branch.id);
      }

      const { data, error } = await query.order('table_number');
      if (error) throw error;
      cachedTables = data || [];
      setTables(cachedTables);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableBill = async (tableId: string, hasCachedData = false, isPaidQr = false) => {
    if (!hasCachedData) {
      setIsFetchingBill(true);
    }
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', tableId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (isPaidQr) {
        // Para mesas con pago QR verificado, traemos los pedidos recientes de la mesa
        const recentTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', recentTime);
      } else {
        query = query.eq('is_paid', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      if ((!data || data.length === 0) && !isPaidQr) {
        const recentTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const { data: recentData } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('table_id', tableId)
          .neq('status', 'cancelled')
          .gte('created_at', recentTime)
          .order('created_at', { ascending: false });

        if (recentData && recentData.length > 0) {
          setTableOrders(recentData);
          return;
        }
      }

      setTableOrders(data || []);
    } catch (err) {
      console.error('Error fetching table bill:', err);
    } finally {
      setIsFetchingBill(false);
    }
  };

  const fetchActiveRegister = async () => {
    if (!restaurant) return;
    try {
      const { data } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();
      cachedActiveRegister = data || null;
      setActiveRegister(cachedActiveRegister);
    } catch (err) {
      // It's ok if there's no open register
    }
  };

  const handleClearService = async (tableId: string) => {
    const prevTable = tables.find(t => t.id === tableId);

    // Optimistic update
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, service_status: null } : t));
    if (selectedTable?.id === tableId) {
      setSelectedTable({ ...selectedTable, service_status: null });
    }

    try {
      const { error } = await supabase.from('tables').update({ service_status: null }).eq('id', tableId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      if (prevTable) {
        setTables(prev => prev.map(t => t.id === tableId ? prevTable : t));
        if (selectedTable?.id === tableId) {
          setSelectedTable(prevTable);
        }
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    // Optimistic UI update
    setTableOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Error al actualizar el estado del pedido');
      if (selectedTable) {
        fetchTableBill(selectedTable.id);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStartAllPreparation = async () => {
    if (!selectedTable || tableOrders.length === 0) return;
    setIsStartingPrep(true);
    try {
      const pendingOrders = tableOrders.filter(o => 
        o.status === 'sent' || 
        o.status === 'received' || 
        (o.status as string) === 'pending' || 
        !o.status ||
        (o.order_items && o.order_items.some((oi: any) => oi.status === 'sent' || oi.status === 'received' || !oi.status))
      );
      if (pendingOrders.length === 0) return;

      const pendingOrderIds = pendingOrders.map(o => o.id);

      // Optimistic UI update: All orders and all products move to preparing
      setTableOrders(prev => prev.map(o => {
        if (!pendingOrderIds.includes(o.id)) return o;
        const updatedItems = (o.order_items || []).map((item: any) => ({
          ...item,
          status: 'preparing'
        }));
        return {
          ...o,
          status: 'preparing',
          order_items: updatedItems
        };
      }));

      // 1. Update order_items status in parallel
      try {
        await supabase
          .from('order_items')
          .update({ status: 'preparing' })
          .in('order_id', pendingOrderIds);
      } catch (e) {
        console.warn('order_items batch status update warning:', e);
      }

      // 2. Update orders status
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'preparing',
          updated_at: new Date().toISOString()
        })
        .in('id', pendingOrderIds);

      if (error) throw error;

      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err) {
      console.error('Error al pasar pedidos a preparación:', err);
      alert('Error al pasar los pedidos a preparación');
      if (selectedTable) {
        fetchTableBill(selectedTable.id);
      }
    } finally {
      setIsStartingPrep(false);
    }
  };

  const ITEM_NEXT_STATUS: Record<string, OrderStatus> = {
    sent: 'preparing',
    received: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
    delivered: 'received'
  };

  const handleUpdateItemStatusDirect = async (item: FlatOrderItem, targetStatus: OrderStatus) => {
    setUpdatingItemId(item.id);

    // 1. Optimistic UI update for the single product in tableOrders
    setTableOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id !== item.order_id) return order;

        if (item.id.startsWith('order-')) {
          return { ...order, status: targetStatus };
        }

        const updatedItems = (order.order_items || []).map((oi: any) => {
          if (oi.id === item.id) {
            return { ...oi, status: targetStatus };
          }
          return oi;
        });

        const allPreparingOrHigher = updatedItems.every((oi: any) => 
          oi.status === 'preparing' || oi.status === 'ready' || oi.status === 'delivered'
        );
        const allReadyOrHigher = updatedItems.every((oi: any) => 
          oi.status === 'ready' || oi.status === 'delivered'
        );
        const allDelivered = updatedItems.every((oi: any) => 
          oi.status === 'delivered'
        );

        let newOrderStatus = order.status;
        if (allDelivered) {
          newOrderStatus = 'delivered';
        } else if (allReadyOrHigher) {
          newOrderStatus = 'ready';
        } else if (allPreparingOrHigher) {
          newOrderStatus = 'preparing';
        } else {
          newOrderStatus = 'received';
        }

        return {
          ...order,
          status: newOrderStatus,
          order_items: updatedItems
        };
      });
    });

    try {
      // 2. Persist in order_items table in Supabase
      if (!item.id.startsWith('order-')) {
        const { error: itemError } = await supabase
          .from('order_items')
          .update({ status: targetStatus })
          .eq('id', item.id);

        if (itemError) {
          console.warn('Could not update order_items status:', itemError.message);
        }
      }

      // 3. Update parent order status in Supabase if all items have advanced
      const currentOrder = tableOrders.find(o => o.id === item.order_id);
      if (currentOrder) {
        const currentItems = (currentOrder.order_items || []).map((oi: any) => 
          oi.id === item.id ? { ...oi, status: targetStatus } : oi
        );
        const allPreparingOrHigher = currentItems.every((oi: any) => 
          oi.status === 'preparing' || oi.status === 'ready' || oi.status === 'delivered'
        );
        const allReadyOrHigher = currentItems.every((oi: any) => 
          oi.status === 'ready' || oi.status === 'delivered'
        );
        const allDelivered = currentItems.every((oi: any) => 
          oi.status === 'delivered'
        );

        let targetOrderStatus: string | null = null;
        if (allDelivered) {
          targetOrderStatus = 'delivered';
        } else if (allReadyOrHigher) {
          targetOrderStatus = 'ready';
        } else if (allPreparingOrHigher) {
          targetOrderStatus = 'preparing';
        } else {
          targetOrderStatus = 'received';
        }

        if (targetOrderStatus && targetOrderStatus !== currentOrder.status) {
          await supabase
            .from('orders')
            .update({
              status: targetOrderStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.order_id);
        }
      }

      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err) {
      console.error('Error actualizando estado del producto:', err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleUpdateItemStatus = async (item: FlatOrderItem) => {
    const currentStatus = (item.order_status === 'sent' ? 'received' : item.order_status) || 'received';
    const nextStatus = ITEM_NEXT_STATUS[currentStatus] || 'preparing';
    return handleUpdateItemStatusDirect(item, nextStatus);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as FlatOrderItem | undefined;
    if (item) {
      setActiveDraggedItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDraggedItem(null);

    if (!over) return;

    const targetStatus = over.id as OrderStatus;
    const item = active.data.current?.item as FlatOrderItem | undefined;

    if (item && targetStatus) {
      const currentStatus = (item.order_status === 'sent' ? 'received' : item.order_status) || 'received';
      if (currentStatus !== targetStatus) {
        handleUpdateItemStatusDirect(item, targetStatus);
      }
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta mesa de forma permanente?')) return;
    try {
      const { error } = await supabase.from('tables').delete().eq('id', tableId);
      if (error) throw error;
      setSelectedTable(null);
      setTableOrders([]);
      fetchTables();
    } catch (err: any) {
      alert('Error al eliminar la mesa: ' + (err.message || err));
    }
  };

  const handleReleaseTable = async (tableId: string) => {
    setIsClosingBill(true);
    const prevTable = tables.find(t => t.id === tableId);

    // Optimistic update
    setTables(prev => prev.map(t => t.id === tableId ? {
      ...t,
      service_status: null,
      siat_customer_nit: null,
      siat_customer_name: null,
      siat_customer_email: null,
      requested_payment_method: null
    } : t));

    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
      setTableOrders([]);
      setModalStep('details');
    }

    try {
      // 1. Cancelar cualquier pedido pendiente no pagado de esta mesa
      const { error: ordersError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('table_id', tableId)
        .eq('is_paid', false)
        .neq('status', 'cancelled');

      if (ordersError) {
        console.error('Error al cancelar pedidos de la mesa:', ordersError);
        throw ordersError;
      }

      // 2. Liberar el estado de servicio y datos temporales de la mesa
      const { error: tableError } = await supabase
        .from('tables')
        .update({
          service_status: null,
          siat_customer_nit: null,
          siat_customer_name: null,
          siat_customer_email: null,
          requested_payment_method: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tableId);

      if (tableError) throw tableError;

      // 3. Refrescar órdenes pendientes
      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err) {
      console.error(err);
      alert('Error al liberar la mesa');
      if (prevTable) {
        setTables(prev => prev.map(t => t.id === tableId ? prevTable : t));
      }
    } finally {
      setIsClosingBill(false);
    }
  };

  const handleValidateAndReleaseTable = async (tableId: string) => {
    setIsClosingBill(true);
    const prevTable = tables.find(t => t.id === tableId);

    // Optimistic update
    setTables(prev => prev.map(t => t.id === tableId ? {
      ...t,
      service_status: null,
      siat_customer_nit: null,
      siat_customer_name: null,
      siat_customer_email: null,
      requested_payment_method: null
    } : t));

    if (selectedTable?.id === tableId) {
      setSelectedTable(null);
      setTableOrders([]);
      setModalStep('details');
    }

    try {
      // 1. Asegurar que las órdenes activas de la mesa queden marcadas como pagadas (Pago QR) y vinculadas a la caja
      const orderUpdatePayload: any = {
        is_paid: true,
        payment_method: 'Pago QR',
        paid_at: new Date().toISOString()
      };
      if (activeRegister?.id) {
        orderUpdatePayload.cash_register_id = activeRegister.id;
      }
      await supabase
        .from('orders')
        .update(orderUpdatePayload)
        .eq('table_id', tableId)
        .neq('status', 'cancelled');

      // 2. Liberar el estado de servicio y datos temporales de la mesa
      const { error: tableError } = await supabase
        .from('tables')
        .update({
          service_status: null,
          siat_customer_nit: null,
          siat_customer_name: null,
          siat_customer_email: null,
          requested_payment_method: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tableId);

      if (tableError) throw tableError;

      // 3. Imprimir comprobante térmico si opera bajo Régimen Simplificado (opcional)
      if (!hasInvoices) {
        window.open(`/api/receipt/print?tableId=${tableId}&autoPrint=true`, '_blank');
      }

      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err: any) {
      console.error('Error al validar y liberar mesa:', err);
      alert('Error al validar y liberar la mesa: ' + (err.message || err));
      if (prevTable) {
        setTables(prev => prev.map(t => t.id === tableId ? prevTable : t));
      }
    } finally {
      setIsClosingBill(false);
    }
  };

  const handleCloseBill = async () => {
    if (!selectedTable) return;
    setIsClosingBill(true);

    try {
      const orderIds = tableOrders.map(o => o.id);
      let generatedCuf = null;

      // 1. SIAT Emission Logic (If invoices module enabled, requested, and there are orders)
      if (hasInvoices && orderIds.length > 0 && generateInvoice && cashierName) {
        try {
          const nitCi = (cashierNit === '0' || !cashierNit) ? '99002' : cashierNit;
          const rznSocial = nitCi === '99002'
            ? 'CONTROL TRIBUTARIO'
            : ((cashierName === 'S/N' || !cashierName) ? 'S/N' : cashierName);

          const totalBillAmount = tableOrders.reduce((acc, o) => {
            if (o.order_items && o.order_items.length > 0) {
              return acc + o.order_items.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
            }
            return acc + Number(o.total || 0);
          }, 0);

          const rawItems = tableOrders.flatMap(o => o.order_items || []);
          const groupedDetalle: Record<string, any> = {};
          rawItems.forEach((item: any) => {
            const code = item.product_id ? item.product_id.substring(0, 8) : '00000000';
            const key = `${code}-${item.product_name}`;
            if (!groupedDetalle[key]) {
              groupedDetalle[key] = {
                codigoProducto: code,
                descripcion: item.product_name,
                cantidad: 0,
                precioUnitario: Number(item.unit_price || 0),
                montoDescuento: 0,
                subTotal: 0
              };
            }
            groupedDetalle[key].cantidad += Number(item.quantity || 1);
            groupedDetalle[key].subTotal += Number(item.total_price || 0);
          });

          const facturaParams: any = {
            cabecera: {
              fechaEmision: new Date().toISOString(),
              numeroFactura: Math.floor(Math.random() * 10000) + 1,
              montoTotal: totalBillAmount,
              montoTotalSujetoIva: totalBillAmount,
              nombreRazonSocial: rznSocial,
              numeroDocumento: nitCi,
              codigoMetodoPago: paymentMethod === 'Tarjeta' ? 2 : (paymentMethod.includes('QR') ? 7 : 1),
            },
            detalle: Object.values(groupedDetalle)
          };

          if (siatPuntoVenta !== '0') {
            facturaParams.cabecera.codigoPuntoVenta = parseInt(siatPuntoVenta);
          }
          if (paymentMethod === 'Tarjeta' && cardNumber) {
            facturaParams.cabecera.numeroTarjeta = cardNumber;
          }

          const response = await fetch('/api/siat/emitir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId: restaurant?.id,
              branchId: selectedTable.branch_id,
              orderId: orderIds[0],
              facturaParams
            })
          });

          let result;
          try {
            result = await response.json();
          } catch (jsonErr) {
            throw new Error(`Error del servidor HTTP ${response.status}`);
          }

          if (result.success) {
            generatedCuf = result.cuf;

            // Automatically open printable factura (con QR oficial si está disponible)
            if (result.ticketUrl) {
              window.open(result.ticketUrl, '_blank');
            } else {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                const html = `
                  <html>
                    <head>
                      <title>Factura SIAT</title>
                      <style>
                        body { font-family: monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; text-align: center;}
                        h1 { font-size: 20px; margin-bottom: 5px; }
                        h2 { font-size: 16px; margin-top: 0; margin-bottom: 20px;}
                        .items { text-align: left; margin-top: 20px; margin-bottom: 20px;}
                        .footer { font-size: 11px; margin-top: 20px; text-align: center;}
                      </style>
                    </head>
                    <body>
                      <h1>FACTURA ELECTRÓNICA</h1>
                      <h2>${restaurant?.name || 'Servido'}</h2>
                      <div style="text-align:left; font-size:12px; margin-bottom: 10px;">
                        NIT/CI: ${nitCi}<br/>
                        Razón Social: ${rznSocial}
                      </div>
                      <div class="items">
                        ${tableOrders.flatMap(o => (o.order_items || [])).map(item => `
                          <div style="margin-bottom: 5px; display: flex; justify-content: space-between; font-size: 12px;">
                            <span>${item.quantity}x ${item.product_name}</span>
                            <span>Bs ${item.total_price.toLocaleString('es-BO')}</span>
                          </div>
                        `).join('')}
                      </div>
                      <div style="text-align: right; font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 10px;">
                        TOTAL: Bs ${totalBillAmount.toLocaleString('es-BO')}
                      </div>
                      <div class="footer">
                        CUF: ${generatedCuf}<br/><br/>
                        "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"
                      </div>
                      <script>
                        window.onload = function() { window.print(); window.close(); }
                      </script>
                    </body>
                  </html>
                `;
                printWindow.document.write(html);
                printWindow.document.close();
              }
            }

            setSiatResult({
              type: 'success',
              title: result.estado === 'OFFLINE' ? 'Factura Guardada (Fuera de Línea)' : 'Factura SIAT Emitida',
              message: result.mensaje || 'La factura se emitió y validó exitosamente.',
              cuf: generatedCuf
            });
          } else {
            console.error('SIAT Error:', result.error, result.detalles);
            const detailMsg = result.detalles ? (typeof result.detalles === 'string' ? result.detalles : JSON.stringify(result.detalles, null, 2)) : '';
            setSiatResult({
              type: 'error',
              title: 'Error al emitir factura',
              message: result.error + (detailMsg ? `\n${detailMsg}` : '')
            });
            setIsClosingBill(false);
            return;
          }
        } catch (e: any) {
          console.error('Excepción en emisión SIAT:', e);
          setSiatResult({
            type: 'error',
            title: 'Excepción en emisión SIAT',
            message: e.message || 'Error desconocido'
          });
          setIsClosingBill(false);
          return;
        }
      }

      // 2. Mark active orders for this table as paid
      if (orderIds.length > 0) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            is_paid: true,
            payment_method: paymentMethod,
            cash_register_id: activeRegister?.id || null,
            paid_at: new Date().toISOString()
          })
          .in('id', orderIds);

        if (updateError) throw updateError;
      }

      // 3. Clear table service status and temporary customer data
      const { error: tableError } = await supabase
        .from('tables')
        .update({
          service_status: null,
          siat_customer_nit: null,
          siat_customer_name: null,
          siat_customer_email: null,
          requested_payment_method: null
        })
        .eq('id', selectedTable.id);

      if (tableError) throw tableError;

      // 4. Imprimir comprobante térmico si opera bajo Régimen Simplificado
      if (!hasInvoices && orderIds.length > 0) {
        window.open(`/api/receipt/print?tableId=${selectedTable.id}&autoPrint=true`, '_blank');
      }

      if (refreshOrders) {
        await refreshOrders();
      }

      setSelectedTable(null);
      setTableOrders([]);
      setModalStep('details');
      setPaymentMethod('Pago QR');
    } catch (err) {
      console.error(err);
      alert('Error al cerrar la cuenta');
    } finally {
      setIsClosingBill(false);
    }
  };

  // Flatten items for individual strip rendering
  const flatItems: FlatOrderItem[] = useMemo(() => {
    return tableOrders.flatMap(order => {
      const items = order.order_items || [];
      if (items.length === 0) {
        return [{
          id: `order-${order.id}`,
          order_id: order.id,
          product_name: `Pedido #${order.id.slice(0, 6)}`,
          quantity: 1,
          unit_price: Number(order.total || 0),
          total_price: Number(order.total || 0),
          notes: order.notes,
          order_status: (order.status || 'received') as OrderStatus,
          order_created_at: order.created_at
        }];
      }
      return items.map((item: any) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price || 0),
        total_price: Number(item.total_price || 0),
        notes: item.notes,
        order_status: (item.status || order.status || 'received') as OrderStatus,
        order_created_at: order.created_at
      }));
    });
  }, [tableOrders]);

  const receivedItems = useMemo(
    () => flatItems.filter(i => i.order_status === 'sent' || i.order_status === 'received' || !i.order_status),
    [flatItems]
  );
  const preparingItems = useMemo(
    () => flatItems.filter(i => i.order_status === 'preparing'),
    [flatItems]
  );
  const readyItems = useMemo(
    () => flatItems.filter(i => i.order_status === 'ready'),
    [flatItems]
  );
  const deliveredItems = useMemo(
    () => flatItems.filter(i => i.order_status === 'delivered'),
    [flatItems]
  );

  const totalAmount = useMemo(() => {
    return tableOrders.reduce((acc, o) => {
      if (o.order_items && o.order_items.length > 0) {
        return acc + o.order_items.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
      }
      return acc + Number(o.total || 0);
    }, 0);
  }, [tableOrders]);

  const isPaidQr = useMemo(() => {
    if (!selectedTable) return false;
    if (selectedTable.service_status === 'paid_qr') return true;
    if (selectedTable.requested_payment_method === 'Pago QR') return true;
    if (tableOrders.some(o => o.payment_method === 'Pago QR' || (o.payment_method && o.payment_method.toLowerCase().includes('qr')))) return true;
    if (tableOrders.length > 0 && tableOrders.every(o => o.is_paid)) return true;
    return false;
  }, [selectedTable, tableOrders]);

  const activeTableIdsWithOrders = useMemo(() => {
    const set = new Set(orders.map(o => o.table_id));
    tables.forEach(t => {
      if (t.service_status === 'paid_qr' || t.requested_payment_method === 'Pago QR') {
        set.add(t.id);
      }
    });
    return set;
  }, [orders, tables]);

  // Mapa de table_id a pedidos pendientes de preparación (estado inicial antes de 'preparing')
  const newOrdersByTableId = useMemo(() => {
    const map: Record<string, any[]> = {};
    orders.forEach(order => {
      const items = order.order_items || [];
      const hasPendingItems = items.length > 0
        ? items.some((item: any) => !item.status || item.status === 'sent' || item.status === 'received' || (item.status as string) === 'pending')
        : (order.status === 'sent' || order.status === 'received' || (order.status as string) === 'pending' || !order.status);

      if (hasPendingItems && order.table_id) {
        if (!map[order.table_id]) {
          map[order.table_id] = [];
        }
        map[order.table_id].push(order);
      }
    });
    return map;
  }, [orders]);

  const salonTables = useMemo(() => tables.filter(t => t.type !== 'takeaway'), [tables]);

  const counts = useMemo(() => {
    const total = salonTables.length;
    const occupied = salonTables.filter(t => activeTableIdsWithOrders.has(t.id)).length;
    const calling = salonTables.filter(t => t.service_status === 'calling_waiter' || t.service_status === 'requesting_bill' || t.service_status === 'paid_qr' || t.requested_payment_method === 'Pago QR').length;
    const newOrders = salonTables.filter(t => (newOrdersByTableId[t.id]?.length || 0) > 0).length;
    const free = Math.max(0, total - occupied);
    return { total, occupied, free, calling, newOrders };
  }, [salonTables, activeTableIdsWithOrders, newOrdersByTableId]);

  const filteredTables = useMemo(() => {
    return salonTables.filter(t => {
      if (activeTabFilter === 'new_orders') return (newOrdersByTableId[t.id]?.length || 0) > 0;
      if (activeTabFilter === 'occupied') return activeTableIdsWithOrders.has(t.id);
      if (activeTabFilter === 'free') return !activeTableIdsWithOrders.has(t.id);
      if (activeTabFilter === 'calling') return t.service_status === 'calling_waiter' || t.service_status === 'requesting_bill' || t.service_status === 'paid_qr' || t.requested_payment_method === 'Pago QR';
      return true;
    });
  }, [salonTables, activeTabFilter, activeTableIdsWithOrders, newOrdersByTableId]);

  if (sessionLoading || (loading && tables.length === 0)) return <LoadingState />;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2933]">Mesas y Cuentas</h1>
          <p className="text-gray-500 mt-1">Gestión de mesas de salón, pedidos en tiempo real y cobros.</p>
        </div>
        <button
          onClick={() => setShowNewTableModal(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#256629] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus size={18} />
          <span>Nueva Mesa</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-100">
        <button
          onClick={() => setActiveTabFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTabFilter === 'all'
              ? 'bg-[#1F2933] text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Todas</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {counts.total}
          </span>
        </button>

        {counts.newOrders > 0 && (
          <button
            onClick={() => setActiveTabFilter('new_orders')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTabFilter === 'new_orders'
                ? 'bg-[#E76F51] text-white shadow-sm'
                : 'bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E76F51] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E76F51]" />
            </span>
            <span>Nuevos</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTabFilter === 'new_orders' ? 'bg-white/20 text-white' : 'bg-orange-200 text-orange-950'
            }`}>
              {counts.newOrders}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTabFilter('occupied')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTabFilter === 'occupied'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Ocupadas</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'occupied' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
            {counts.occupied}
          </span>
        </button>

        <button
          onClick={() => setActiveTabFilter('free')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTabFilter === 'free'
              ? 'bg-[#2E7D32] text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Libres</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'free' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
            {counts.free}
          </span>
        </button>

        {counts.calling > 0 && (
          <button
            onClick={() => setActiveTabFilter('calling')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTabFilter === 'calling'
                ? 'bg-orange-500 text-white animate-pulse'
                : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <span>Llamados</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'calling' ? 'bg-white/20 text-white' : 'bg-orange-200 text-orange-900'}`}>
              {counts.calling}
            </span>
          </button>
        )}
      </div>

      {tables.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl flex flex-col items-center justify-center py-20 px-4 text-center">
          <EmptyState
            icon={Receipt}
            title="No hay mesas registradas"
            subtitle="Crea tu primera mesa de salón o barra para comenzar a operar."
          />
          <button
            onClick={() => setShowNewTableModal(true)}
            className="mt-6 flex items-center gap-2 bg-[#2E7D32] hover:bg-[#256629] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            <span>Crear Primera Mesa</span>
          </button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-3xl flex items-center justify-center py-16 text-gray-500 text-sm">
          No hay mesas en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredTables.map(table => {
            const isCalling = table.service_status === 'calling_waiter';
            const isTablePaidQr = table.service_status === 'paid_qr' || (table.requested_payment_method === 'Pago QR' && table.service_status !== 'calling_waiter');
            const isRequestingBill = table.service_status === 'requesting_bill' && !isTablePaidQr;
            const isOccupied = activeTableIdsWithOrders.has(table.id) || isTablePaidQr;
            const pendingOrders = newOrdersByTableId[table.id] || [];
            const hasNewOrder = pendingOrders.length > 0;
            const newOrdersCount = pendingOrders.length;

            return (
              <div
                key={table.id}
                onClick={() => {
                  setSelectedTable(table);
                  setModalStep('details');
                  if (table.service_status === 'paid_qr' || table.requested_payment_method === 'Pago QR') {
                    fetchTableBill(table.id, false, true);
                  } else {
                    const cachedForTable = orders.filter(
                      (o) => o.table_id === table.id && o.status !== 'cancelled' && !o.is_paid
                    );
                    setTableOrders(cachedForTable);
                    fetchTableBill(table.id, cachedForTable.length > 0, false);
                  }
                }}
                className={`relative flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-2 cursor-pointer transition-all hover:-translate-y-1 shadow-sm ${
                  isTablePaidQr
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/30 animate-pulse'
                    : hasNewOrder && !isCalling && !isRequestingBill
                    ? 'border-[#E76F51] bg-[#FFF8F6] shadow-md ring-2 ring-[#E76F51]/20'
                    : isCalling
                    ? 'border-orange-400 bg-orange-50 animate-pulse'
                    : isRequestingBill
                    ? 'border-green-400 bg-green-50'
                    : isOccupied
                    ? 'border-blue-400 bg-blue-50/50 hover:border-blue-500'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Burbuja individual de nuevo pedido (permanece hasta pasar a preparación) */}
                {hasNewOrder && !isTablePaidQr && (
                  <div
                    className="absolute -top-3 -left-3 z-10 flex items-center gap-1.5 bg-[#E76F51] text-white px-2.5 py-1 rounded-full shadow-lg border-2 border-white animate-bounce"
                    title="¡Nuevo pedido pendiente de preparación!"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      {newOrdersCount > 1 ? `${newOrdersCount} nuevos` : 'Nuevo'}
                    </span>
                  </div>
                )}

                {/* Status Indicator Badges */}
                {isTablePaidQr && (
                  <div className="absolute -top-3 -right-3 bg-emerald-600 text-white p-2 rounded-full shadow-lg animate-bounce" title="Pago QR verificado y acreditado">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                {!isTablePaidQr && isCalling && (
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white p-2 rounded-full shadow-lg" title="Mesero llamado">
                    <HandPlatter size={20} />
                  </div>
                )}
                {!isTablePaidQr && isRequestingBill && (
                  <div className="absolute -top-3 -right-3 bg-green-600 text-white p-2 rounded-full shadow-lg animate-bounce" title="Pide la cuenta">
                    <Receipt size={20} />
                  </div>
                )}

                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${
                  isTablePaidQr
                    ? 'bg-emerald-200 text-emerald-800 ring-4 ring-emerald-200/50'
                    : hasNewOrder && !isCalling && !isRequestingBill
                    ? 'bg-orange-100 text-[#E76F51] ring-4 ring-orange-200/50'
                    : isCalling
                    ? 'bg-orange-200 text-orange-700'
                    : isRequestingBill
                    ? 'bg-green-200 text-green-700'
                    : isOccupied
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  <span className="text-xl font-bold">
                    {table.table_number.replace(/^(Mesa|Barra)\s*/i, '')}
                  </span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <span className="font-bold text-gray-800 text-base">{table.table_number}</span>
                  {table.type === 'takeaway' && (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full mt-1">
                      Para llevar
                    </span>
                  )}
                </div>

                {isTablePaidQr ? (
                  <span className="text-xs font-black text-emerald-700 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Pago QR Verificado
                  </span>
                ) : hasNewOrder && !isCalling && !isRequestingBill ? (
                  <span className="text-xs font-bold text-[#E76F51] mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E76F51] animate-ping" />
                    Nuevo pedido
                  </span>
                ) : isCalling ? (
                  <span className="text-xs font-bold text-orange-600 mt-2">Mesero llamado</span>
                ) : isRequestingBill ? (
                  <span className="text-xs font-bold text-green-600 mt-2">Pide la cuenta</span>
                ) : isOccupied ? (
                  <span className="text-xs font-bold text-blue-600 mt-2">Ocupada</span>
                ) : (
                  <span className="text-xs font-medium text-gray-400 mt-2">Libre</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bill & Orders Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 backdrop-blur-xs">
          <div className="bg-white w-full max-w-7xl rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{selectedTable.table_number}</h2>
                  {selectedTable.type === 'takeaway' ? (
                    <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-bold bg-purple-100 text-purple-700">
                      Barra / Para llevar
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Mesa de Salón
                    </span>
                  )}
                  {flatItems.length > 0 && (
                    <span className="text-xs sm:text-sm px-3 py-1 rounded-full font-bold bg-gray-100 text-gray-700">
                      {flatItems.length} {flatItems.length === 1 ? 'producto' : 'productos'}
                    </span>
                  )}
                  {isFetchingBill && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium ml-1">
                      <Loader2 size={13} className="animate-spin text-gray-400" />
                      <span className="hidden sm:inline">Sincronizando...</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {modalStep === 'details' ? 'Tablero Kanban de preparación y cobranza' : 'Cobro y liquidación de cuenta'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* QR Button matching menu module design */}
                <button
                  type="button"
                  onClick={() => setShowTableQr(true)}
                  className="flex items-center gap-2 bg-[#E76F51] hover:bg-[#d65e40] text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm active:scale-95"
                  title="Mostrar código QR de la mesa"
                >
                  <QrCode size={16} />
                  <span className="hidden sm:inline">QR Mesa</span>
                </button>

                {/* Delete Table button (only available if table has no active orders) */}
                {flatItems.length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                    title="Eliminar mesa permanentemente"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTable(null);
                    setModalStep('details');
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Split View Body: Left ~75% Kanban / Right ~25% Account & Checkout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-gray-50">
              
              {/* LEFT SIDE: KANBAN BOARD */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-3 sm:p-4 lg:p-5">
                
                {/* Service Status Banners (Waiter call, SIAT invoice request, QR payment verified) */}
                <div className="space-y-3 mb-3 sm:mb-4 flex-shrink-0">
                  {/* Paid QR banner */}
                  {isPaidQr && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                      <div className="flex items-center gap-3 text-emerald-900">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-sm text-emerald-900">Pago Verificado por QR (Acreditado)</p>
                            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[11px] font-black rounded-full uppercase tracking-wider">
                              Acreditado
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            El cliente completó el pago por QR exitosamente. Presiona &quot;Validar&quot; para liberar la mesa.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleValidateAndReleaseTable(selectedTable.id)}
                        disabled={isClosingBill}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex-shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>{isClosingBill ? 'Validando...' : 'Validar'}</span>
                      </button>
                    </div>
                  )}

                  {/* Waiter call banner */}
                  {selectedTable.service_status === 'calling_waiter' && (
                    <div className="bg-orange-100 border border-orange-200 rounded-2xl p-3 sm:p-4 flex justify-between items-center shadow-xs">
                      <div className="flex items-center gap-3 text-orange-900">
                        <HandPlatter size={22} className="flex-shrink-0 text-orange-600" />
                        <div>
                          <p className="font-extrabold text-sm">Esta mesa está llamando al mesero</p>
                          <p className="text-xs text-orange-800">El cliente necesita atención presencial.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleClearService(selectedTable.id)}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex-shrink-0"
                      >
                        Atendido
                      </button>
                    </div>
                  )}

                  {/* SIAT Invoice Request Info Banner */}
                  {hasInvoices && selectedTable.service_status === 'requesting_bill' && selectedTable.siat_customer_name && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 sm:p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 text-blue-900">
                          <Receipt size={18} className="text-blue-700" />
                          <h3 className="font-bold text-sm">El cliente solicitó Factura (SIAT):</h3>
                        </div>
                      </div>
                      <div className="text-xs text-blue-800 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 bg-white/70 p-2.5 rounded-xl border border-blue-100">
                        <p><span className="font-semibold text-blue-900">NIT/CI:</span> {selectedTable.siat_customer_nit}</p>
                        <p><span className="font-semibold text-blue-900">Razón Social:</span> {selectedTable.siat_customer_name}</p>
                        {selectedTable.siat_customer_email && (
                          <p className="col-span-1 sm:col-span-2"><span className="font-semibold text-blue-900">Correo:</span> {selectedTable.siat_customer_email}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Kanban Columns Container */}
                {isFetchingBill && flatItems.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">
                    <Loader2 className="animate-spin mr-2 text-gray-400" size={24} />
                    <span>Cargando pedidos...</span>
                  </div>
                ) : flatItems.length === 0 ? (
                  <div className="flex-1 bg-white rounded-3xl border border-gray-200/80 p-8 flex flex-col items-center justify-center text-center shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Sin pedidos pendientes</h3>
                    <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
                      Esta mesa no tiene comandas abiertas. Puedes liberarla para que quede disponible para nuevos comensales.
                    </p>
                    <button
                      onClick={() => handleReleaseTable(selectedTable.id)}
                      disabled={isClosingBill}
                      className="mt-6 px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      {isClosingBill ? 'Liberando...' : 'Liberar Mesa'}
                    </button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 pb-1">
                      <div className="grid grid-cols-4 gap-3 h-full w-full min-w-[700px]">
                        {/* Column 1: Recibidos */}
                        <KanbanColumn
                          id="received"
                          title="Recibidos"
                          icon={<Clock className="w-4 h-4 text-blue-600" />}
                          count={receivedItems.length}
                          theme={{
                            headerBg: 'bg-blue-50/70',
                            border: 'border-blue-100',
                            badgeBg: 'bg-blue-100',
                            badgeText: 'text-blue-800'
                          }}
                          batchAction={receivedItems.length > 0 ? {
                            label: 'Pasar a Prep',
                            onClick: handleStartAllPreparation,
                            loading: isStartingPrep,
                            icon: <ChefHat size={13} />
                          } : undefined}
                        >
                          {receivedItems.map(item => (
                            <KanbanCard
                              key={item.id}
                              item={item}
                              onAdvance={handleUpdateItemStatus}
                              isUpdating={updatingItemId === item.id}
                            />
                          ))}
                        </KanbanColumn>

                        {/* Column 2: En Preparación */}
                        <KanbanColumn
                          id="preparing"
                          title="En Preparación"
                          icon={<ChefHat className="w-4 h-4 text-amber-600" />}
                          count={preparingItems.length}
                          theme={{
                            headerBg: 'bg-amber-50/70',
                            border: 'border-amber-100',
                            badgeBg: 'bg-amber-100',
                            badgeText: 'text-amber-800'
                          }}
                        >
                          {preparingItems.map(item => (
                            <KanbanCard
                              key={item.id}
                              item={item}
                              onAdvance={handleUpdateItemStatus}
                              isUpdating={updatingItemId === item.id}
                            />
                          ))}
                        </KanbanColumn>

                        {/* Column 3: Listos en Cocina */}
                        <KanbanColumn
                          id="ready"
                          title="Listos"
                          icon={<BellRing className="w-4 h-4 text-emerald-600" />}
                          count={readyItems.length}
                          theme={{
                            headerBg: 'bg-emerald-50/70',
                            border: 'border-emerald-100',
                            badgeBg: 'bg-emerald-100',
                            badgeText: 'text-emerald-800'
                          }}
                        >
                          {readyItems.map(item => (
                            <KanbanCard
                              key={item.id}
                              item={item}
                              onAdvance={handleUpdateItemStatus}
                              isUpdating={updatingItemId === item.id}
                            />
                          ))}
                        </KanbanColumn>

                        {/* Column 4: Entregados */}
                        <KanbanColumn
                          id="delivered"
                          title="Entregados"
                          icon={<UtensilsCrossed className="w-4 h-4 text-gray-500" />}
                          count={deliveredItems.length}
                          theme={{
                            headerBg: 'bg-gray-100/70',
                            border: 'border-gray-200',
                            badgeBg: 'bg-gray-200',
                            badgeText: 'text-gray-800'
                          }}
                        >
                          {deliveredItems.map(item => (
                            <KanbanCard
                              key={item.id}
                              item={item}
                              onAdvance={handleUpdateItemStatus}
                              isUpdating={updatingItemId === item.id}
                            />
                          ))}
                        </KanbanColumn>
                      </div>
                    </div>

                    {/* Drag Overlay for smooth preview while dragging */}
                    <DragOverlay>
                      {activeDraggedItem ? (
                        <KanbanCard
                          item={activeDraggedItem}
                          onAdvance={() => {}}
                          isUpdating={false}
                          isOverlay
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>

              {/* RIGHT SIDE: ACCOUNT SUMMARY & CHECKOUT (Fixed Sticky Panel) */}
              <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col justify-between overflow-y-auto">
                {modalStep === 'details' ? (
                  <div className="p-5 flex flex-col h-full justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="text-sm font-black uppercase text-gray-500 tracking-wider">
                          Resumen de Cuenta
                        </span>
                        <span className="text-sm font-bold text-gray-600">
                          {flatItems.length} {flatItems.length === 1 ? 'ítem' : 'ítems'}
                        </span>
                      </div>

                      {/* Big total display */}
                      {isPaidQr ? (
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center shadow-xs">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full mb-1">
                            <CheckCircle2 size={14} className="text-emerald-700" />
                            <span>PAGO QR VERIFICADO</span>
                          </div>
                          <span className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-tight block">
                            Bs {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 mt-1 block">
                            Monto acreditado exitosamente
                          </span>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                          <span className="text-sm font-bold text-gray-500 block mb-1">
                            Total a Pagar
                          </span>
                          <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                            Bs {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Items mini list */}
                      <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                        {flatItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="font-black text-gray-900 flex-shrink-0">{item.quantity}x</span>
                              <span className="text-gray-800 truncate font-semibold">{item.product_name}</span>
                            </div>
                            <span className="font-extrabold text-gray-900 flex-shrink-0">
                              Bs {item.total_price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5 pt-4 border-t border-gray-100">
                      {isPaidQr ? (
                        <button
                          type="button"
                          disabled={isClosingBill}
                          onClick={() => handleValidateAndReleaseTable(selectedTable.id)}
                          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={20} />
                          <span>{isClosingBill ? 'Validando...' : 'Validar'}</span>
                        </button>
                      ) : (
                        <>
                          {flatItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setModalStep('checkout')}
                              className="w-full py-3.5 px-4 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-2xl transition-all shadow-sm active:scale-[0.98] text-base flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Receipt size={20} />
                              <span>Cobrar Cuenta</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isClosingBill}
                            onClick={() => {
                              if (flatItems.length > 0) {
                                if (!confirm('¿Estás seguro de liberar esta mesa sin cobrar? Se cancelarán los pedidos pendientes de esta mesa.')) {
                                  return;
                                }
                              }
                              handleReleaseTable(selectedTable.id);
                            }}
                            className="w-full py-2.5 px-3 border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 font-semibold rounded-xl transition-colors text-sm text-center disabled:opacity-50 cursor-pointer"
                          >
                            {isClosingBill ? 'Liberando...' : 'Liberar mesa sin cobrar'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Step 2: Checkout Form */
                  <div className="p-5 flex flex-col h-full justify-between gap-4">
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => setModalStep('details')}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={16} />
                        <span>Volver al Tablero</span>
                      </button>

                      <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 text-center">
                        <span className="text-sm font-bold text-emerald-800 block mb-1">
                          Total a Liquidar
                        </span>
                        <span className="text-3xl font-black text-gray-900">
                          Bs {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Payment Method Selector */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                          {selectedTable.requested_payment_method
                            ? `Método solicitado: ${selectedTable.requested_payment_method}`
                            : 'Método de pago:'}
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] font-semibold text-gray-800 text-sm"
                        >
                          <option value="Pago QR">Pago QR</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta</option>
                        </select>

                        {paymentMethod === 'Tarjeta' && (
                          <div className="mt-2.5">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Número de Tarjeta (Primeros 4 y últimos 4):
                            </label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={e => setCardNumber(e.target.value)}
                              placeholder="1234000000005678"
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* SIAT Invoice Section */}
                      {hasInvoices ? (
                        <div className="pt-2 border-t border-gray-100">
                          <label className="flex items-center gap-2 cursor-pointer mb-2.5 select-none">
                            <input
                              type="checkbox"
                              checked={generateInvoice}
                              onChange={e => setGenerateInvoice(e.target.checked)}
                              className="w-4 h-4 text-[#2E7D32] rounded focus:ring-[#2E7D32]"
                            />
                            <span className="font-bold text-gray-800 text-sm">Generar Factura (SIAT)</span>
                          </label>

                          {generateInvoice && (
                            <div className="space-y-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-0.5">NIT / CI</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={cashierNit}
                                  onChange={e => setCashierNit(e.target.value.replace(/\D/g, ''))}
                                  placeholder="Ej. 1234567"
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-0.5">Razón Social</label>
                                <input
                                  type="text"
                                  value={cashierName}
                                  onChange={e => setCashierName(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''))}
                                  placeholder="Nombre o Razón Social"
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-0.5">Punto de Venta SIAT</label>
                                <select
                                  value={siatPuntoVenta}
                                  onChange={e => setSiatPuntoVenta(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                                >
                                  <option value="0">Punto de Venta 0</option>
                                  <option value="1">Punto de Venta 1</option>
                                  <option value="2">Punto de Venta 2</option>
                                  <option value="3">Punto de Venta 3</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-950 text-xs">Régimen RTS</p>
                              <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                                Emisión de comprobante térmico simplificado.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!activeRegister && (
                        <p className="text-xs text-orange-600 font-medium leading-tight">
                          Nota: La caja diaria no está abierta. El cobro no sumará a un arqueo de turno.
                        </p>
                      )}
                    </div>

                    {/* Step 2 Actions */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <button
                        disabled={isClosingBill}
                        onClick={handleCloseBill}
                        className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-2xl transition-all disabled:opacity-50 text-base flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
                      >
                        <Receipt size={20} />
                        <span>{isClosingBill ? 'Procesando...' : 'Cobrar y Liberar'}</span>
                      </button>

                      <button
                        disabled={isClosingBill}
                        onClick={() => setModalStep('details')}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table QR Modal */}
      <TableQrModal
        table={selectedTable}
        restaurant={restaurant}
        isOpen={showTableQr}
        onClose={() => setShowTableQr(false)}
      />

      {/* New Table Modal */}
      <NewTableModal
        restaurantId={restaurant?.id || ''}
        branchId={branch?.id}
        isOpen={showNewTableModal}
        forceType="dine_in"
        onClose={() => setShowNewTableModal(false)}
        onSaved={() => {
          fetchTables();
        }}
      />

      {/* Custom SIAT Notification Modal */}
      {siatResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 ${siatResult.type === 'success' ? 'bg-[#F0FDF4]' : 'bg-[#FEF2F2]'} border-b ${siatResult.type === 'success' ? 'border-[#DCFCE7]' : 'border-[#FEE2E2]'} flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${siatResult.type === 'success' ? 'bg-[#2E7D32] text-white' : 'bg-red-500 text-white'}`}>
                {siatResult.type === 'success' ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${siatResult.type === 'success' ? 'text-[#166534]' : 'text-red-900'}`}>
                  {siatResult.title}
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{siatResult.message}</p>

              {siatResult.cuf && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">CUF Generado</p>
                  <p className="text-sm font-mono text-gray-800 break-all">{siatResult.cuf}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSiatResult(null)}
                className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors ${siatResult.type === 'success' ? 'bg-[#2E7D32] hover:bg-[#256629]' : 'bg-gray-800 hover:bg-gray-900'}`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
