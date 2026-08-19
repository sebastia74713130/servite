'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { Receipt, HandPlatter, BellRing, X, CheckCircle, Printer } from 'lucide-react';
import { RestaurantTable, Order } from '@shared/types';
import { useOrders } from '@/hooks/useOrders';

export default function AccountsPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  const { orders } = useOrders(restaurant?.id, { onlyUnpaid: true });
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  
  // For the active bill in the modal
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [isClosingBill, setIsClosingBill] = useState(false);

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
  }, [restaurant?.id]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableBill(selectedTable.id);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    if (!restaurant) return;
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('table_number');
      if (error) throw error;
      setTables(data || []);
    } catch (err) {
      console.error(err);
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
      console.error(err);
    } finally {
      setIsFetchingBill(false);
    }
  };

  const handleClearService = async (tableId: string) => {
    // Actualización inmediata en la UI (Optimistic update)
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, service_status: null } : t));
    if (selectedTable?.id === tableId) {
      setSelectedTable({ ...selectedTable, service_status: null });
    }
    
    try {
      await supabase.from('tables').update({ service_status: null }).eq('id', tableId);
    } catch (err) {
      console.error(err);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [activeRegister, setActiveRegister] = useState<any>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchActiveRegister();
    }
  }, [restaurant?.id]);

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

  const handleCloseBill = async () => {
    if (!selectedTable) return;
    setIsClosingBill(true);
    
    // Actualización inmediata en la UI
    setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, service_status: null } : t));
    
    try {
      const orderIds = tableOrders.map(o => o.id);
      if (orderIds.length === 0) throw new Error("No hay órdenes");

      let generatedCuf = null;

      // 1. SIAT Emission Logic (If requested)
      if (selectedTable.service_status === 'requesting_bill' && selectedTable.siat_customer_name) {
        try {
          const totalAmount = tableOrders.reduce((acc, o) => acc + o.total, 0);
          const facturaParams = {
            cabecera: {
              fechaEmision: new Date().toISOString(),
              numeroFactura: Math.floor(Math.random() * 10000) + 1, // Número correlativo simulado
              montoTotal: totalAmount,
              montoTotalSujetoIva: totalAmount,
              nombreRazonSocial: selectedTable.siat_customer_name,
              numeroDocumento: selectedTable.siat_customer_nit || '0'
            },
            detalle: tableOrders.flatMap(o => o.order_items).map((item: any) => ({
              codigoProducto: item.product_id ? item.product_id.substring(0, 8) : '00000000',
              descripcion: item.product_name,
              cantidad: item.quantity,
              precioUnitario: item.unit_price,
              montoDescuento: 0,
              subTotal: item.total_price
            }))
          };

          const response = await fetch('/api/siat/emitir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId: restaurant?.id,
              orderId: orderIds[0],
              facturaParams
            })
          });

          const result = await response.json();
          if (result.success) {
            generatedCuf = result.cuf;
            
            // Print the Factura automatically
            const printWindow = window.open("", "_blank");
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
                    <h2>${restaurant?.name || "Servido"}</h2>
                    <div style="text-align:left; font-size:12px; margin-bottom: 10px;">
                      NIT/CI: ${selectedTable.siat_customer_nit}<br/>
                      Razón Social: ${selectedTable.siat_customer_name}
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
                      TOTAL: Bs ${totalAmount.toLocaleString('es-BO')}
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
            
            alert('✅ Factura SIAT emitida exitosamente.\nCUF: ' + generatedCuf.substring(0, 15) + '...');
          } else {
            console.error("SIAT Error:", result.error);
            alert("⚠️ Atención: Hubo un problema al emitir la factura SIAT: " + result.error);
          }
        } catch (e) {
          console.error("Excepción en emisión SIAT:", e);
        }
      }

      // 2. Mark all active orders for this table as paid
      await supabase
        .from('orders')
        .update({ 
          is_paid: true,
          payment_method: paymentMethod,
          cash_register_id: activeRegister?.id || null,
          paid_at: new Date().toISOString()
          // Nota: Guardar el CUF en la BD requeriría una columna 'siat_cuf' en 'orders'
        })
        .in('id', orderIds);
      
      // 3. Clear table service status and temporary SIAT data
      await supabase
        .from('tables')
        .update({ 
          service_status: null,
          siat_customer_nit: null,
          siat_customer_name: null,
          siat_customer_email: null
        })
        .eq('id', selectedTable.id);

      setSelectedTable(null);
      setTableOrders([]);
      setPaymentMethod('Efectivo'); // reset
    } catch (err) {
      console.error(err);
      alert('Error al cerrar la cuenta');
    } finally {
      setIsClosingBill(false);
    }
  };

  const handlePrintBill = () => {
    if (!selectedTable || tableOrders.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const allItemsHtml = tableOrders.flatMap(order => 
      (order.order_items || []).map((item: any) => `
        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>${item.quantity}x ${item.product_name}</span>
          <span>Bs ${item.total_price.toLocaleString('es-BO')}</span>
        </div>
      `)
    ).join("");

    const total = tableOrders.reduce((acc, o) => acc + o.total, 0);

    const html = `
      <html>
        <head>
          <title>Cuenta ${selectedTable.table_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; width: 300px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 5px; text-align: center; }
            h2 { font-size: 18px; margin-top: 0; color: #555; border-bottom: 1px dashed #000; padding-bottom: 10px; text-align: center; }
            .items { margin-top: 20px; }
            .total { margin-top: 20px; font-size: 18px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; display: flex; justify-content: space-between; }
            .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <h1>${restaurant?.name || "Servido"}</h1>
          <h2>${selectedTable.table_number}</h2>
          <div class="items">
            ${allItemsHtml}
          </div>
          <div class="total">
            <span>TOTAL</span>
            <span>Bs ${total.toLocaleString('es-BO')}</span>
          </div>
          <div class="footer">
            ¡Gracias por su visita!<br/>
            ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (sessionLoading || loading) return <LoadingState />;

  const activeTableIdsWithOrders = new Set(orders.map(o => o.table_id));

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2933]">Cuentas y Mesas</h1>
          <p className="text-gray-500 mt-1">Administra las cuentas y atiende los llamados de los clientes.</p>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl flex items-center justify-center py-20">
          <EmptyState 
            icon={Receipt} 
            title="No hay mesas registradas" 
            subtitle="Ve a la configuración para crear mesas."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {tables.filter(t => t.type !== 'takeaway').map(table => {
            const isCalling = table.service_status === 'calling_waiter';
            const isRequestingBill = table.service_status === 'requesting_bill';
            const isOccupied = activeTableIdsWithOrders.has(table.id);
            
            return (
              <div 
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`relative flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-2 cursor-pointer transition-all hover:-translate-y-1 shadow-sm ${
                  isCalling ? 'border-orange-400 bg-orange-50 animate-pulse' :
                  isRequestingBill ? 'border-green-400 bg-green-50' :
                  isOccupied ? 'border-blue-400 bg-blue-50 hover:border-blue-500' :
                  'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Status Indicator Badges */}
                {isCalling && (
                  <div className="absolute -top-3 -right-3 bg-orange-500 text-white p-2 rounded-full shadow-lg">
                    <HandPlatter size={20} />
                  </div>
                )}
                {isRequestingBill && (
                  <div className="absolute -top-3 -right-3 bg-green-600 text-white p-2 rounded-full shadow-lg animate-bounce">
                    <Receipt size={20} />
                  </div>
                )}

                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                  isCalling ? 'bg-orange-200 text-orange-700' :
                  isRequestingBill ? 'bg-green-200 text-green-700' :
                  isOccupied ? 'bg-blue-200 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  <span className="text-2xl font-bold">{table.table_number.replace('Mesa ', '')}</span>
                </div>
                <span className="font-bold text-gray-700">{table.table_number}</span>
                
                {isCalling && (
                  <span className="text-xs font-bold text-orange-600 mt-2">Mesero llamado</span>
                )}
                {isRequestingBill && (
                  <span className="text-xs font-bold text-green-600 mt-2">Pide la cuenta</span>
                )}
                {isOccupied && !isCalling && !isRequestingBill && (
                  <span className="text-xs font-bold text-blue-600 mt-2">Ocupada</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bill/Account Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedTable.table_number}</h2>
                <p className="text-sm text-gray-500">Resumen de cuenta actual</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintBill} 
                  disabled={tableOrders.length === 0}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
                  title="Imprimir cuenta"
                >
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelectedTable(null)} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {selectedTable.service_status === 'calling_waiter' && (
                <div className="mb-6 bg-orange-100 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-orange-800">
                    <HandPlatter size={24} />
                    <span className="font-bold">Esta mesa está llamando al mesero.</span>
                  </div>
                  <button 
                    onClick={() => handleClearService(selectedTable.id)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-sm"
                  >
                    Atendido
                  </button>
                </div>
              )}

              {/* SIAT Billing Data Display */}
              {selectedTable.service_status === 'requesting_bill' && selectedTable.siat_customer_name && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-blue-900 mb-3">
                    <Receipt size={24} />
                    <h3 className="font-bold">El cliente solicitó Factura (SIAT):</h3>
                  </div>
                  <div className="text-sm text-blue-800 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 bg-white/50 p-3 rounded-lg">
                    <p><span className="font-semibold text-blue-900">NIT/CI:</span> {selectedTable.siat_customer_nit}</p>
                    <p><span className="font-semibold text-blue-900">Razón Social:</span> {selectedTable.siat_customer_name}</p>
                    {selectedTable.siat_customer_email && (
                      <p className="col-span-1 sm:col-span-2"><span className="font-semibold text-blue-900">Correo:</span> {selectedTable.siat_customer_email}</p>
                    )}
                  </div>
                </div>
              )}

              {isFetchingBill ? (
                <div className="text-center py-10 text-gray-500">Cargando cuenta...</div>
              ) : tableOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                  <CheckCircle size={48} className="mb-4 text-gray-300" />
                  <p>No hay pedidos pendientes por cobrar en esta mesa.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tableOrders.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase">
                          {order.status === 'delivered' ? 'Entregado' : 'Pendiente de entrega'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700"><span className="font-bold text-gray-400 mr-2">{item.quantity}x</span>{item.product_name}</span>
                            <span className="font-medium text-gray-900">Bs {item.total_price.toLocaleString('es-BO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg text-gray-600">Total a cobrar:</span>
                <span className="text-3xl font-bold text-gray-900">
                  Bs {tableOrders.reduce((acc, o) => acc + o.total, 0).toLocaleString('es-BO')}
                </span>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago:</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="QR / Transferencia">QR / Transferencia</option>
                </select>
                {!activeRegister && (
                  <p className="text-xs text-orange-600 mt-2">
                    Nota: La caja está cerrada. El pago se marcará pero no se registrará en la caja diaria.
                  </p>
                )}
              </div>

              <button
                disabled={isClosingBill || tableOrders.length === 0}
                onClick={handleCloseBill}
                className="w-full py-4 bg-[#2E7D32] hover:bg-[#256629] text-white font-bold rounded-2xl transition-colors disabled:opacity-50 text-lg flex items-center justify-center gap-2"
              >
                <Receipt size={24} />
                {isClosingBill ? 'Cerrando cuenta...' : 'Cobrar y Liberar Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
