import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@shared/types';
import { Scale, CheckCircle2 } from 'lucide-react';

export function ReconciliationView({ restaurantId }: { restaurantId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [realStock, setRealStock] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    supabase.from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setItems(data);
          const initialStock: Record<string, string> = {};
          data.forEach(item => {
            initialStock[item.id] = item.current_stock.toString();
          });
          setRealStock(initialStock);
        }
      });
  }, [restaurantId]);

  const handleAdjust = async (item: InventoryItem) => {
    const rStock = parseFloat(realStock[item.id]);
    if (isNaN(rStock)) return;
    if (rStock === Number(item.current_stock)) return; // No change

    setLoading(true);
    setSuccessMsg('');

    try {
      const diff = rStock - Number(item.current_stock);
      const mType = diff < 0 ? 'waste' : 'adjustment';

      // 1. Update stock
      await supabase.from('inventory_items')
        .update({ current_stock: rStock })
        .eq('id', item.id);

      // 2. Insert movement
      await supabase.from('inventory_movements').insert({
        restaurant_id: restaurantId,
        inventory_item_id: item.id,
        movement_type: mType,
        quantity: diff,
        previous_stock: item.current_stock,
        new_stock: rStock,
        notes: `Ajuste manual de cuadre de inventario`
      });

      // Update local state
      setItems(items.map(i => i.id === item.id ? { ...i, current_stock: rStock } : i));
      setSuccessMsg(`Inventario actualizado para ${item.name}`);
      
      setTimeout(() => setSuccessMsg(''), 3000);

    } catch (err) {
      console.error(err);
      alert('Error al ajustar el inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
      <div className="p-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Scale className="text-[#2F4F3E]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1F2933]">Conciliación de Inventario</h2>
            <p className="text-gray-500 text-sm">Ajusta el stock real para cuadrar mermas y desperdicios.</p>
          </div>
        </div>
        
        {successMsg && (
          <div className="mt-4 bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#1F2933]">
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="py-4 px-6 font-semibold">Insumo</th>
              <th className="py-4 px-6 font-semibold">Stock Teórico</th>
              <th className="py-4 px-6 font-semibold w-48">Stock Real</th>
              <th className="py-4 px-6 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {items.map(item => {
              const currentRStock = parseFloat(realStock[item.id] || '0');
              const tStock = Number(item.current_stock);
              const diff = currentRStock - tStock;
              const hasChanged = diff !== 0;

              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-medium">{item.name}</span>
                  </td>
                  <td className="py-4 px-6">
                    {tStock} {item.unit}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={realStock[item.id]}
                        onChange={e => setRealStock({ ...realStock, [item.id]: e.target.value })}
                        className={`w-24 border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-offset-0 transition-colors ${
                          hasChanged 
                            ? (diff < 0 ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-green-300 focus:ring-green-500 bg-green-50')
                            : 'border-[#E5E7EB] focus:ring-[#2F4F3E]'
                        }`}
                      />
                      <span className="text-gray-500">{item.unit}</span>
                    </div>
                    {hasChanged && (
                      <div className={`text-xs mt-1 font-medium ${diff < 0 ? 'text-red-500' : 'text-green-600'}`}>
                        Diferencia: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleAdjust(item)}
                      disabled={!hasChanged || loading}
                      className="px-4 py-1.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#2F4F3E] text-white hover:bg-[#2F4F3E]/90"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay insumos registrados en el catálogo.
          </div>
        )}
      </div>
    </div>
  );
}

