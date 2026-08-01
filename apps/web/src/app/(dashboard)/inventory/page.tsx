'use client';

import { useState, useEffect, useRef } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { Package, Plus, AlertTriangle, ArrowRight, ShoppingCart, Printer } from 'lucide-react';
import { InventoryItem } from '@shared/types';
import { useReactToPrint } from 'react-to-print';
import { InventoryItemModal } from './InventoryItemModal';

export default function InventoryPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping_list'>('inventory');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Lista de Compras',
  });

  useEffect(() => {
    if (restaurant?.id) {
      fetchInventory();
    }
  }, [restaurant?.id]);

  const fetchInventory = async () => {
    if (!restaurant) return;
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');
        
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loading) return <LoadingState />;

  const lowStockItems = items.filter(item => item.current_stock <= item.min_stock);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2933]">Inventario</h1>
          <p className="text-gray-500 mt-1">Controla los insumos, configura recetas y crea listas de compras.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setSelectedItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#1F2933] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#111827] transition-colors"
          >
            <Plus size={18} />
            Nuevo Insumo
          </button>
          
          <button 
            onClick={() => setActiveTab('shopping_list')}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors rounded-lg ${activeTab === 'shopping_list' ? 'bg-[#2F4F3E] text-white border-[#2F4F3E]' : 'border-[#2F4F3E] text-[#2F4F3E] hover:bg-[#2F4F3E]/10'}`}
          >
            <ShoppingCart size={18} />
            Lista de Compras
            {lowStockItems.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {lowStockItems.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors rounded-lg ${activeTab === 'inventory' ? 'bg-[#2F4F3E] text-white border-[#2F4F3E]' : 'border-[#2F4F3E] text-[#2F4F3E] hover:bg-[#2F4F3E]/10'}`}
          >
            <Package size={18} />
            Insumos
          </button>
        </div>
      </div>
      
      {activeTab === 'inventory' ? (
        <>
          {lowStockItems.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-red-800">Alerta de Stock Bajo</h3>
                <p className="text-sm text-red-700">Tienes {lowStockItems.length} insumos por debajo del stock mínimo. Revisa la lista de compras.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 font-medium text-gray-500 grid grid-cols-12 gap-4">
              <div className="col-span-5">Insumo</div>
              <div className="col-span-2 text-center">Stock Actual</div>
              <div className="col-span-2 text-center">Mínimo</div>
              <div className="col-span-2 text-center">Costo Unit.</div>
              <div className="col-span-1 text-center">Acción</div>
            </div>
            
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No tienes insumos registrados.</p>
                </div>
              ) : (
                items.map(item => {
                  const isLow = item.current_stock <= item.min_stock;
                  return (
                    <div key={item.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 font-medium text-[#1F2933] flex items-center gap-2">
                        {item.name}
                        {item.is_compound && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            Compuesto
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${isLow ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#1F2933]'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </div>
                      <div className="col-span-2 text-center text-gray-500 text-sm">
                        {item.min_stock} {item.unit}
                      </div>
                      <div className="col-span-2 text-center text-gray-500 text-sm">
                        Bs {item.cost_per_unit.toLocaleString('es-BO')}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => {
                            setSelectedItem(item);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-[#E76F51] transition-colors rounded-lg hover:bg-orange-50"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#1F2933]">Lista de Compras Sugerida</h2>
            <button 
              onClick={handlePrint}
              disabled={lowStockItems.length === 0}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Printer size={18} />
              Imprimir Lista
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-30 text-green-500" />
              <h3 className="text-lg font-bold text-gray-700">¡Todo en orden!</h3>
              <p>No tienes insumos con stock bajo en este momento.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto" ref={componentRef}>
              <div className="p-8 print:p-0">
                <div className="hidden print:block mb-6">
                  <h1 className="text-2xl font-bold text-black mb-2">Lista de Compras</h1>
                  <p className="text-gray-500">Generada el {new Date().toLocaleDateString()}</p>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-gray-600">
                      <th className="py-3 px-4">Insumo</th>
                      <th className="py-3 px-4">Stock Actual</th>
                      <th className="py-3 px-4">Stock Mínimo</th>
                      <th className="py-3 px-4">Comprar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map(item => {
                      const suggestAmount = item.min_stock * 2 - item.current_stock;
                      return (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4 font-bold text-[#1F2933]">{item.name}</td>
                          <td className="py-4 px-4 text-red-600 font-medium">{item.current_stock} {item.unit}</td>
                          <td className="py-4 px-4 text-gray-500">{item.min_stock} {item.unit}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" className="w-5 h-5 rounded border-gray-400 text-[#2F4F3E] focus:ring-[#2F4F3E]" />
                              <div className="hidden print:block w-24 border-b border-gray-400 pt-4"></div>
                              <span className="print:hidden text-sm text-gray-400 font-medium">(Sug: {suggestAmount > 0 ? suggestAmount : item.min_stock} {item.unit})</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && restaurant && branch && (
        <InventoryItemModal
          item={selectedItem}
          restaurantId={restaurant.id}
          branchId={branch.id}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            fetchInventory();
          }}
        />
      )}
    </div>
  );
}
