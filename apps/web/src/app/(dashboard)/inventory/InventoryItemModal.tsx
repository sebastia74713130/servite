import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@shared/types';
import { X, AlertCircle, Check, Database, FlaskConical } from 'lucide-react';
import { InventoryRecipeTab } from './InventoryRecipeTab';

interface Props {
  item: InventoryItem | null;
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function InventoryItemModal({ item, restaurantId, branchId, onClose, onSaved }: Props) {
  const [name, setName] = useState(item?.name || '');
  const [unit, setUnit] = useState(item?.unit || 'kg');
  const [currentStock, setCurrentStock] = useState(item?.current_stock?.toString() || '0');
  const [minStock, setMinStock] = useState(item?.min_stock?.toString() || '0');
  const [costPerUnit, setCostPerUnit] = useState(item?.cost_per_unit?.toString() || '0');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isCompound, setIsCompound] = useState(item?.is_compound || false);
  const [activeTab, setActiveTab] = useState<'details' | 'recipe'>('details');

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
        current_stock: parseFloat(currentStock) || 0,
        min_stock: parseFloat(minStock) || 0,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        is_compound: isCompound,
      };

      if (item?.id) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', item.id);
        if (updateError) throw updateError;
        
        // Don't close immediately if it's a compound item and we're on details tab,
        // so the user can switch to the recipe tab
        if (isCompound && activeTab === 'details') {
          alert('Detalles guardados. Ve a la pestaña "Sub-receta" para agregar ingredientes.');
        } else {
          onSaved();
        }
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select()
          .single();
        if (insertError) throw insertError;
        
        // If it's compound, switch to recipe tab and keep modal open, otherwise close
        if (isCompound && insertedData) {
          // We need to pass the newly created item to the recipe tab. 
          // Since item is passed via props, we might just close it and let user reopen it,
          // OR we can call onSaved but maybe we can't switch seamlessly without a parent state change.
          alert('Insumo compuesto creado. Por favor vuelve a abrirlo para configurarle su receta.');
          onSaved();
        } else {
          onSaved();
        }
      }
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

        {/* TABS */}
        <div className="flex border-b border-[#E5E7EB] bg-gray-50 px-6 pt-2 gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'details' ? 'border-[#2F4F3E] text-[#2F4F3E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Database size={16} /> Detalles
          </button>
          {isCompound && (
            <button
              onClick={() => {
                if (item) setActiveTab('recipe');
                else alert('Guarda el insumo primero para configurarle una receta.');
              }}
              className={`pb-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'recipe' ? 'border-[#2F4F3E] text-[#2F4F3E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FlaskConical size={16} /> Sub-receta
            </button>
          )}
        </div>

        {activeTab === 'details' ? (
        <>
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
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <input 
                type="checkbox" 
                id="isCompound"
                checked={isCompound}
                onChange={e => setIsCompound(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <div>
                <label htmlFor="isCompound" className="font-bold text-blue-900 cursor-pointer block">Es Insumo Compuesto (Sub-receta)</label>
                <p className="text-sm text-blue-800 mt-0.5">
                  Márcalo si este insumo es una preparación (ej. Masa, Salsa) que está hecha de otros ingredientes básicos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Stock Actual</label>
                <input
                  type="number"
                  step="any"
                  value={currentStock}
                  onChange={e => setCurrentStock(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Stock Mínimo</label>
                <input
                  type="number"
                  step="any"
                  value={minStock}
                  onChange={e => setMinStock(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Costo Unitario (Bs)</label>
                <input
                  type="number"
                  step="any"
                  value={costPerUnit}
                  onChange={e => setCostPerUnit(e.target.value)}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#2F4F3E]/30 focus:border-[#2F4F3E] transition-colors"
                />
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
          {activeTab === 'details' && (
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
          )}
        </div>
        </>
        ) : (
          <div className="flex-1 overflow-hidden bg-white">
            <InventoryRecipeTab parentItem={item!} restaurantId={restaurantId} />
          </div>
        )}
      </div>
    </div>
  );
}
