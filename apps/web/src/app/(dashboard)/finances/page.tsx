'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { createExpense, openCashRegister, closeCashRegister, getExpenses } from '@/app/actions';
import { LoadingState } from '@/components/LoadingState';
import { Wallet, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { CashRegister, Expense, Order } from '@shared/types';

export default function FinancesPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const [loading, setLoading] = useState(true);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Form states
  const [openingBalance, setOpeningBalance] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Insumos');
  const [expenseMethod, setExpenseMethod] = useState('Efectivo');

  useEffect(() => {
    if (restaurant?.id) {
      fetchActiveRegister();
    }
  }, [restaurant?.id]);

  const fetchActiveRegister = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      setActiveRegister(data || null);
      
      if (data) {
        await Promise.all([
          fetchExpenses(data.id),
          fetchPaidOrders(data.id)
        ]);
      } else {
        setExpenses([]);
        setPaidOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (registerId: string) => {
    try {
      const data = await getExpenses(registerId);
      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  const fetchPaidOrders = async (registerId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('cash_register_id', registerId)
      .eq('is_paid', true)
      .order('paid_at', { ascending: false });
    setPaidOrders(data || []);
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    
    try {
      const result = await openCashRegister({
        restaurant_id: restaurant.id,
        branch_id: branch?.id || restaurant.id,
        status: 'open',
        opening_balance: parseFloat(openingBalance) || 0,
      });
        
      setActiveRegister(result.data);
      setShowOpenModal(false);
      setOpeningBalance('');
    } catch (err: any) {
      console.error(err);
      alert(`Error al abrir la caja: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleCloseRegister = async () => {
    if (!activeRegister) return;
    
    try {
      const ingresosEfectivo = paidOrders.filter(o => !o.payment_method || o.payment_method === 'Efectivo').reduce((sum, order) => sum + order.total, 0);
      const egresosEfectivo = expenses.filter(e => !e.payment_method || e.payment_method === 'Efectivo').reduce((sum, exp) => sum + exp.amount, 0);
      const closingBalance = activeRegister.opening_balance + ingresosEfectivo - egresosEfectivo;
      
      await closeCashRegister(activeRegister.id, closingBalance);
        
      setActiveRegister(null);
      setExpenses([]);
      setPaidOrders([]);
      setShowCloseModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`Error al cerrar la caja: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !activeRegister) return;
    
    try {
      await createExpense({
        restaurant_id: restaurant.id,
        branch_id: branch?.id || restaurant.id,
        cash_register_id: activeRegister.id,
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        category: expenseCategory,
        payment_method: expenseMethod,
      });
        
      setShowExpenseModal(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('Insumos');
      setExpenseMethod('Efectivo');
      fetchExpenses(activeRegister.id);
    } catch (err: any) {
      console.error(err);
      alert(`Error al registrar gasto: ${err?.message || JSON.stringify(err)}`);
    }
  };

  if (sessionLoading || loading) return <LoadingState />;

  const totalIngresos = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const totalEgresos = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const ingresosEfectivo = paidOrders.filter(o => !o.payment_method || o.payment_method === 'Efectivo').reduce((sum, order) => sum + order.total, 0);
  const ingresosTarjeta = paidOrders.filter(o => o.payment_method === 'Tarjeta').reduce((sum, order) => sum + order.total, 0);
  const ingresosTransferencia = paidOrders.filter(o => o.payment_method === 'Transferencia' || o.payment_method === 'QR').reduce((sum, order) => sum + order.total, 0);
  
  const egresosEfectivo = expenses.filter(e => !e.payment_method || e.payment_method === 'Efectivo').reduce((sum, exp) => sum + exp.amount, 0);
  const egresosTarjeta = expenses.filter(e => e.payment_method === 'Tarjeta').reduce((sum, exp) => sum + exp.amount, 0);
  const egresosTransferencia = expenses.filter(e => e.payment_method === 'Transferencia' || e.payment_method === 'QR').reduce((sum, exp) => sum + exp.amount, 0);
  
  const currentTotalCash = activeRegister ? activeRegister.opening_balance + ingresosEfectivo - egresosEfectivo : 0;

  // Combinar y ordenar movimientos recientes (ventas y gastos)
  const allMovements = [
    ...paidOrders.map(o => ({
      id: o.id,
      type: 'ingreso',
      amount: o.total,
      description: `Pedido ${o.table_number}`,
      date: new Date(o.paid_at || o.created_at),
      method: o.payment_method || 'Efectivo'
    })),
    ...expenses.map(e => ({
      id: e.id,
      type: 'egreso',
      amount: e.amount,
      description: e.description,
      date: new Date(e.created_at),
      method: e.payment_method || 'Efectivo'
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2933]">Finanzas (Caja)</h1>
          <p className="text-gray-500 mt-1">Controla los ingresos, egresos y el cierre de caja diario.</p>
        </div>
        <div className="flex gap-4">
          <button 
            disabled={!activeRegister}
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E76F51] text-white rounded-lg hover:bg-[#D55D40] transition-colors disabled:opacity-50"
          >
            <Plus size={20} />
            Registrar Gasto
          </button>
          {!activeRegister ? (
            <button 
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2F4F3E] text-white rounded-lg hover:bg-[#233A2E] transition-colors"
            >
              <Wallet size={20} />
              Abrir Caja
            </button>
          ) : (
            <button 
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#E76F51] text-[#E76F51] rounded-lg hover:bg-[#E76F51]/10 transition-colors"
            >
              <Wallet size={20} />
              Cerrar Caja
            </button>
          )}
        </div>
      </div>
      
      {activeRegister ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Base Inicial</p>
              <p className="text-2xl font-bold text-[#1F2933]">Bs {activeRegister.opening_balance.toLocaleString('es-BO')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Wallet size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Ingresos (Ventas)</p>
              <p className="text-2xl font-bold text-green-600">Bs {totalIngresos.toLocaleString('es-BO')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Egresos (Gastos)</p>
              <p className="text-2xl font-bold text-red-600">Bs {totalEgresos.toLocaleString('es-BO')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <TrendingDown size={24} />
            </div>
          </div>

          <div className="bg-[#2F4F3E] p-6 rounded-2xl border border-[#233A2E] shadow-sm flex flex-col justify-center text-white">
            <p className="text-white/80 text-sm font-medium mb-1">Total Efectivo en Caja</p>
            <p className="text-3xl font-bold">Bs {currentTotalCash.toLocaleString('es-BO')}</p>
            <p className="text-white/60 text-xs mt-2">Solo suma transacciones en efectivo</p>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-6 mb-8 text-center">
          <Wallet size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">La caja está cerrada</h2>
          <p>Debes abrir la caja con un monto inicial para registrar ventas y gastos de hoy.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-[#1F2933]">Movimientos Recientes</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0">
          {allMovements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay movimientos registrados en este turno.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm sticky top-0">
                <tr>
                  <th className="py-3 px-6 font-medium">Hora</th>
                  <th className="py-3 px-6 font-medium">Descripción</th>
                  <th className="py-3 px-6 font-medium">Método</th>
                  <th className="py-3 px-6 font-medium text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {allMovements.map(mov => (
                  <tr key={mov.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-6 text-sm text-gray-500">
                      {mov.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-6 font-medium text-[#1F2933]">
                      {mov.description}
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">
                      {mov.method}
                    </td>
                    <td className={`py-3 px-6 font-bold text-right ${mov.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.type === 'ingreso' ? '+' : '-'} {mov.amount.toLocaleString('es-BO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODALS */}
      
      {/* Abrir Caja Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Abrir Caja</h2>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleOpenRegister} className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Base Inicial (Bs)
              </label>
              <input 
                type="number" 
                required
                min="0"
                step="0.1"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E76F51]/20 focus:border-[#E76F51] mb-6 text-lg font-bold"
                placeholder="Ej. 100"
              />
              <button type="submit" className="w-full py-3 bg-[#2F4F3E] text-white rounded-xl font-bold hover:bg-[#233A2E] transition-colors">
                Abrir Turno
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cerrar Caja Modal */}
      {showCloseModal && activeRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-red-50">
              <h2 className="text-xl font-bold text-red-900">Cerrar Caja</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-red-400 hover:text-red-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 mb-4">Verifica que el dinero físico coincida con este resumen antes de cerrar el turno.</p>
              
              <div className="flex justify-between text-gray-600">
                <span>Base inicial:</span>
                <span className="font-medium">Bs {activeRegister.opening_balance.toLocaleString('es-BO')}</span>
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Ingresos por Ventas (Total: Bs {totalIngresos.toLocaleString('es-BO')})</p>
                <div className="space-y-1 pl-4 border-l-2 border-green-200">
                  <div className="flex justify-between text-green-700 text-sm">
                    <span>Efectivo:</span>
                    <span className="font-medium">Bs {ingresosEfectivo.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-green-700 text-sm">
                    <span>Tarjeta:</span>
                    <span className="font-medium">Bs {ingresosTarjeta.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-green-700 text-sm">
                    <span>Transferencia / QR:</span>
                    <span className="font-medium">Bs {ingresosTransferencia.toLocaleString('es-BO')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Egresos y Gastos (Total: Bs {totalEgresos.toLocaleString('es-BO')})</p>
                <div className="space-y-1 pl-4 border-l-2 border-red-200">
                  <div className="flex justify-between text-red-700 text-sm">
                    <span>Efectivo:</span>
                    <span className="font-medium">Bs {egresosEfectivo.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-red-700 text-sm">
                    <span>Tarjeta:</span>
                    <span className="font-medium">Bs {egresosTarjeta.toLocaleString('es-BO')}</span>
                  </div>
                  <div className="flex justify-between text-red-700 text-sm">
                    <span>Transferencia / QR:</span>
                    <span className="font-medium">Bs {egresosTransferencia.toLocaleString('es-BO')}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center text-xl">
                <span className="font-bold text-gray-900">Total Efectivo Esperado:</span>
                <span className="font-bold text-[#2F4F3E]">Bs {currentTotalCash.toLocaleString('es-BO')}</span>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-4">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleCloseRegister} className="flex-1 py-3 bg-[#E76F51] text-white font-bold rounded-xl hover:bg-[#D55D40] transition-colors">
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registrar Gasto Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Registrar Gasto</h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Bs)</label>
                <input 
                  type="number" 
                  required min="0.1" step="0.1"
                  value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#E76F51]"
                  placeholder="Ej. 50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input 
                  type="text" required
                  value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#E76F51]"
                  placeholder="Ej. Compra de hielo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select 
                    value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#E76F51]"
                  >
                    <option>Insumos</option>
                    <option>Servicios</option>
                    <option>Salarios</option>
                    <option>Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                  <select 
                    value={expenseMethod} onChange={e => setExpenseMethod(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#E76F51]"
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Tarjeta</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full mt-4 py-3 bg-[#E76F51] text-white rounded-xl font-bold hover:bg-[#D55D40] transition-colors">
                Guardar Gasto
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
