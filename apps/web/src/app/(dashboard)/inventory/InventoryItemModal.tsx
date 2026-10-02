import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@shared/types';
import { X, AlertCircle, Check, Lock } from 'lucide-react';

interface Props {
  item: InventoryItem | null;
  restaurantId: string;
  branchId: string;
  subscriptionPlan?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function InventoryItemModal({ item, restaurantId, branchId, subscriptionPlan, onClose, onSaved }: Props) {
  const [name, setName] = useState(item?.name || '');
  const [unit, setUnit] = useState(item?.unit || 'kg');
  
  // These are kept to preserve their existing values on DB update
  const currentStock = parseFloat(item?.current_stock?.toString() || '0');
  const [minStock, setMinStock] = useState<string | number>(item?.min_stock ?? '');
  const costPerUnit = parseFloat(item?.cost_per_unit?.toString() || '0');
  const isCompound = item?.is_compound || false;
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        restaurant_id: restaurantId,
        branch_id: branchId,
        name: name.trim(),
        unit,
        current_stock: currentStock,
        min_stock: parseFloat(minStock.toString()) || 0,
        cost_per_unit: costPerUnit,
        is_compound: isCompound,
      };

      if (item?.id) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', item.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert(payload);
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el insumo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este insumo?')) return;
    
    setSaving(true);
    try {
      const { error: delError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', item.id);
        
      if (delError) throw delError;
      onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al eliminar');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-[#1F2933]">
            {item ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-[#6B7280]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} id="inventory-form" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre del Insumo *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors"
                placeholder="Ej: Carne de hamburguesa, Tomate"
              />
            </div>
            
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Unidad de Medida</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors bg-white"
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="unidades">Unidades</option>
                  <option value="paquetes">Paquetes</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center justify-between">
                  Stock Mínimo (Alerta)
                  {(subscriptionPlan || '').toUpperCase() === 'PRO' && <Lock size={14} className="text-gray-400" />}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minStock}
                  onChange={e => setMinStock(e.target.value)}
                  disabled={(subscriptionPlan || '').toUpperCase() === 'PRO'}
                  className={`w-full border rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 transition-colors ${
                    (subscriptionPlan || '').toUpperCase() === 'PRO' 
                      ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'border-[#E5E7EB] focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] bg-white'
                  }`}
                />
                {(subscriptionPlan || '').toUpperCase() === 'PRO' && (
                  <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1 font-medium">
                    <Lock size={12} /> Disponible en plan Enterprise
                  </p>
                )}
              </div>
            </div>


            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-[#E5E7EB] shrink-0 bg-white rounded-b-2xl flex gap-3">
          {item && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-4 py-3 font-medium hover:bg-[#F9FAFB] transition-colors"
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="inventory-form"
            disabled={saving}
            className="flex-1 bg-[#2F4F3E] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#1C3026] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Guardando...' : (
              <>
                <Check size={16} />
                {item ? 'Guardar Cambios' : 'Crear'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
