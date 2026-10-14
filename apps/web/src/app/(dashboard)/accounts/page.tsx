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
  ArrowLeft
} from 'lucide-react';
import { RestaurantTable, OrderStatus } from '@shared/types';
import { useOrders } from '@/hooks/useOrders';

interface FlatOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  order_status: OrderStatus;
  order_created_at: string;
}

export default function AccountsPage() {
  const { restaurant, branch, loading: sessionLoading, hasModule } = useRestaurantSession();
  const hasInvoices = hasModule('invoices');
  const { orders, refreshOrders } = useOrders(restaurant?.id, branch?.id, { onlyUnpaid: true });
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Table grid filters
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'occupied' | 'calling'>('all');

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
  const [activeRegister, setActiveRegister] = useState<any>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchTables();

      // Subscribe to table changes (for service_status updates)
      const tablesSub = supabase
        .channel(`public:tables_${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
          fetchTables();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(tablesSub);
      };
    }
  }, [restaurant?.id, branch?.id]);

  useEffect(() => {
    if (selectedTable) {
      setModalStep('details');
      fetchTableBill(selectedTable.id);
    }
  }, [selectedTable]);

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
      setTables(data || []);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableBill = async (tableId: string) => {
    setIsFetchingBill(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', tableId)
        .eq('is_paid', false)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      setActiveRegister(data || null);
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

            // Automatically open printable factura
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
        order_status: (order.status || 'received') as OrderStatus,
        order_created_at: order.created_at
      }));
    });
  }, [tableOrders]);

  const totalAmount = useMemo(() => {
    return tableOrders.reduce((acc, o) => {
      if (o.order_items && o.order_items.length > 0) {
        return acc + o.order_items.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
      }
      return acc + Number(o.total || 0);
    }, 0);
  }, [tableOrders]);

  const activeTableIdsWithOrders = useMemo(() => new Set(orders.map(o => o.table_id)), [orders]);

  const counts = useMemo(() => {
    const total = tables.length;
    const dineIn = tables.filter(t => t.type !== 'takeaway').length;
    const takeaway = tables.filter(t => t.type === 'takeaway').length;
    const occupied = tables.filter(t => activeTableIdsWithOrders.has(t.id)).length;
    const calling = tables.filter(t => t.service_status === 'calling_waiter' || t.service_status === 'requesting_bill').length;
    return { total, dineIn, takeaway, occupied, calling };
  }, [tables, activeTableIdsWithOrders]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (activeTabFilter === 'dine_in') return t.type !== 'takeaway';
      if (activeTabFilter === 'takeaway') return t.type === 'takeaway';
      if (activeTabFilter === 'occupied') return activeTableIdsWithOrders.has(t.id);
      if (activeTabFilter === 'calling') return t.service_status === 'calling_waiter' || t.service_status === 'requesting_bill';
      return true;
    });
  }, [tables, activeTabFilter, activeTableIdsWithOrders]);

  if (sessionLoading || loading) return <LoadingState />;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2933]">Mesas y Pedidos</h1>
          <p className="text-gray-500 mt-1">Control integral de salón: mesas, pedidos en tiempo real y cobros.</p>
        </div>
        <button
          onClick={() => setShowNewTableModal(true)}
          className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#256629] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Nueva Mesa</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-gray-100">
        <button
          onClick={() => setActiveTabFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
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

        <button
          onClick={() => setActiveTabFilter('dine_in')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTabFilter === 'dine_in'
              ? 'bg-[#1F2933] text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Salón</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'dine_in' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {counts.dineIn}
          </span>
        </button>

        <button
          onClick={() => setActiveTabFilter('takeaway')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTabFilter === 'takeaway'
              ? 'bg-[#1F2933] text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Barra / Llevar</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTabFilter === 'takeaway' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {counts.takeaway}
          </span>
        </button>

        <button
          onClick={() => setActiveTabFilter('occupied')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
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

        {counts.calling > 0 && (
          <button
            onClick={() => setActiveTabFilter('calling')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
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
            const isRequestingBill = table.service_status === 'requesting_bill';
            const isOccupied = activeTableIdsWithOrders.has(table.id);

            return (
              <div
                key={table.id}
                onClick={() => {
                  setSelectedTable(table);
                  setModalStep('details');
                }}
                className={`relative flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-2 cursor-pointer transition-all hover:-translate-y-1 shadow-sm ${
                  isCalling ? 'border-orange-400 bg-orange-50 animate-pulse' :
                  isRequestingBill ? 'border-green-400 bg-green-50' :
                  isOccupied ? 'border-blue-400 bg-blue-50/50 hover:border-blue-500' :
                  'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Status Indicator Badges */}
                {isCalling && (
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white p-2 rounded-full shadow-lg" title="Mesero llamado">
                    <HandPlatter size={20} />
                  </div>
                )}
                {isRequestingBill && (
                  <div className="absolute -top-3 -right-3 bg-green-600 text-white p-2 rounded-full shadow-lg animate-bounce" title="Pide la cuenta">
                    <Receipt size={20} />
                  </div>
                )}

                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${
                  isCalling ? 'bg-orange-200 text-orange-700' :
                  isRequestingBill ? 'bg-green-200 text-green-700' :
                  isOccupied ? 'bg-blue-200 text-blue-700' :
                  'bg-gray-100 text-gray-500'
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

                {isCalling && (
                  <span className="text-xs font-bold text-orange-600 mt-2">Mesero llamado</span>
                )}
                {isRequestingBill && (
                  <span className="text-xs font-bold text-green-600 mt-2">Pide la cuenta</span>
                )}
                {isOccupied && !isCalling && !isRequestingBill && (
                  <span className="text-xs font-bold text-blue-600 mt-2">Ocupada</span>
                )}
                {!isOccupied && !isCalling && !isRequestingBill && (
                  <span className="text-xs font-medium text-gray-400 mt-2">Libre</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bill & Orders Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 animate-in fade-in duration-200 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTable.table_number}</h2>
                  {selectedTable.type === 'takeaway' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">
                      Barra / Para llevar
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {modalStep === 'details' ? 'Detalle de pedidos y estados' : 'Cobro y liquidación de cuenta'}
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

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTable(null);
                    setModalStep('details');
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Step 1: Details and Individual Product Strips */}
            {modalStep === 'details' && (
              <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                  {/* Waiter call banner */}
                  {selectedTable.service_status === 'calling_waiter' && (
                    <div className="bg-orange-100 border border-orange-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
                      <div className="flex items-center gap-3 text-orange-800">
                        <HandPlatter size={24} />
                        <span className="font-bold text-sm">Esta mesa está llamando al mesero.</span>
                      </div>
                      <button
                        onClick={() => handleClearService(selectedTable.id)}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                      >
                        Atendido
                      </button>
                    </div>
                  )}

                  {/* SIAT Invoice Request Info Banner */}
                  {hasInvoices && selectedTable.service_status === 'requesting_bill' && selectedTable.siat_customer_name && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5 text-blue-900">
                          <Receipt size={20} />
                          <h3 className="font-bold text-sm">El cliente solicitó Factura (SIAT):</h3>
                        </div>
                      </div>
                      <div className="text-xs text-blue-800 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 bg-white/60 p-3 rounded-xl border border-blue-100">
                        <p><span className="font-semibold text-blue-900">NIT/CI:</span> {selectedTable.siat_customer_nit}</p>
                        <p><span className="font-semibold text-blue-900">Razón Social:</span> {selectedTable.siat_customer_name}</p>
                        {selectedTable.siat_customer_email && (
                          <p className="col-span-1 sm:col-span-2"><span className="font-semibold text-blue-900">Correo:</span> {selectedTable.siat_customer_email}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Individual Product Strips */}
                  {isFetchingBill ? (
                    <div className="text-center py-12 text-gray-500 font-medium">Cargando pedidos...</div>
                  ) : flatItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-3">
                        <CheckCircle size={36} />
                      </div>
                      <p className="font-bold text-gray-800 text-lg">Sin pedidos pendientes</p>
                      <p className="text-sm text-gray-400 mt-1 max-w-xs text-center">
                        No existen pedidos abiertos para esta mesa. Puedes liberarla para dejarla lista para nuevos clientes.
                      </p>
                      <button
                        onClick={() => handleReleaseTable(selectedTable.id)}
                        disabled={isClosingBill}
                        className="mt-5 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                      >
                        Liberar Mesa
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-400 px-1 uppercase tracking-wider">
                        <span>Productos pedidos ({flatItems.length})</span>
                        <span>Estado</span>
                      </div>
                      {flatItems.map(item => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 text-gray-800 font-extrabold text-xs flex items-center justify-center">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{item.product_name}</h4>
                                <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                  <Clock size={12} />
                                  {new Date(item.order_created_at).toLocaleTimeString('es-BO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'America/La_Paz'
                                  })}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-amber-100 font-medium">
                                  Nota: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                              Bs {item.total_price.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <select
                              value={item.order_status === 'sent' ? 'received' : item.order_status}
                              disabled={updatingOrderId === item.order_id}
                              onChange={e => handleUpdateOrderStatus(item.order_id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none transition-all ${
                                item.order_status === 'preparing'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                                  : item.order_status === 'ready'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : item.order_status === 'delivered'
                                  ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                              }`}
                            >
                              <option value="received">Recibido</option>
                              <option value="preparing">En preparación</option>
                              <option value="ready">Listo</option>
                              <option value="delivered">Entregado</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Step 1 */}
                {flatItems.length > 0 && (
                  <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-base text-gray-600 font-medium">Total de la cuenta:</span>
                      <span className="text-3xl font-extrabold text-gray-900">
                        Bs {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        disabled={isClosingBill}
                        onClick={() => {
                          if (confirm('¿Estás seguro de liberar esta mesa sin cobrar? Se cancelarán los pedidos pendientes de esta mesa.')) {
                            handleReleaseTable(selectedTable.id);
                          }
                        }}
                        className="flex-1 py-3 px-4 border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 font-semibold rounded-2xl transition-colors text-sm text-center disabled:opacity-50"
                      >
                        Liberar mesa sin cobrar
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalStep('checkout')}
                        className="flex-1 py-3.5 px-6 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-2xl transition-all shadow-sm active:scale-[0.99] text-base flex items-center justify-center gap-2"
                      >
                        <Receipt size={20} />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Modal Step 2: Payment and Liberation */}
            {modalStep === 'checkout' && (
              <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                  <button
                    type="button"
                    onClick={() => setModalStep('details')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Volver a pedidos</span>
                  </button>

                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-600">Total a liquidar:</span>
                      <span className="text-2xl font-black text-gray-900">
                        Bs {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {selectedTable.requested_payment_method
                          ? `Método solicitado: ${selectedTable.requested_payment_method}`
                          : 'Método de pago:'}
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] font-medium text-gray-800"
                      >
                        <option value="Pago QR">Pago QR</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                      </select>

                      {paymentMethod === 'Tarjeta' && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Número de Tarjeta (Primeros 4 y últimos 4 ej. 1234000000005678):
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            placeholder="1234000000005678"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {hasInvoices ? (
                      <div className="pt-3 border-t border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
                          <input
                            type="checkbox"
                            checked={generateInvoice}
                            onChange={e => setGenerateInvoice(e.target.checked)}
                            className="w-4 h-4 text-[#2E7D32] rounded focus:ring-[#2E7D32]"
                          />
                          <span className="font-bold text-gray-800 text-sm">Generar Factura Electrónica (SIAT)</span>
                        </label>

                        {generateInvoice && (
                          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">NIT / CI</label>
                              <input
                                type="text"
                                value={cashierNit}
                                onChange={e => setCashierNit(e.target.value)}
                                placeholder="Ej. 1234567"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Razón Social</label>
                              <input
                                type="text"
                                value={cashierName}
                                onChange={e => setCashierName(e.target.value)}
                                placeholder="Nombre o Razón Social del cliente"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Punto de Venta SIAT</label>
                              <select
                                value={siatPuntoVenta}
                                onChange={e => setSiatPuntoVenta(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] text-sm"
                              >
                                <option value="0">Punto de Venta 0 (Por Defecto)</option>
                                <option value="1">Punto de Venta 1</option>
                                <option value="2">Punto de Venta 2</option>
                                <option value="3">Punto de Venta 3</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-950">Régimen Tributario Simplificado (RTS)</p>
                            <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                              Este restaurante opera bajo régimen simplificado. Al cobrar se emitirá un comprobante de venta térmico no válido para crédito fiscal.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!activeRegister && (
                      <p className="text-xs text-orange-600 font-medium">
                        Nota: La caja diaria no está abierta. El cobro se procesará y la mesa quedará libre, pero no se sumará a un arqueo de turno.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Step 2 */}
                <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl space-y-2">
                  <button
                    disabled={isClosingBill}
                    onClick={handleCloseBill}
                    className="w-full py-4 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-2xl transition-all disabled:opacity-50 text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                  >
                    <Receipt size={22} />
                    {isClosingBill ? 'Procesando y liberando...' : 'Cobrar y Liberar Mesa'}
                  </button>

                  <button
                    disabled={isClosingBill}
                    onClick={() => setModalStep('details')}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors"
                  >
                    Cancelar y volver
                  </button>
                </div>
              </>
            )}
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
