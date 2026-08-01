import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem, ProductRecipe, Product } from '@shared/types';
import { Trash2, Plus, ChefHat, Save } from 'lucide-react';

interface Props {
  product: Product;
  restaurantId: string;
}

export function ProductRecipeTab({ product, restaurantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recipeLines, setRecipeLines] = useState<ProductRecipe[]>([]);
  const [saving, setSaving] = useState(false);

  // form for new line
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    fetchData();
  }, [product.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, recipeRes] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).order('name'),
        supabase.from('product_recipes').select('*').eq('product_id', product.id)
      ]);
      setItems(itemsRes.data || []);
      setRecipeLines(recipeRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !quantity) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .insert({
          product_id: product.id,
          inventory_item_id: selectedItemId,
          quantity_required: parseFloat(quantity)
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setRecipeLines([...recipeLines, data]);
      }
      setSelectedItemId('');
      setQuantity('');
    } catch (err) {
      console.error(err);
      alert('Error al agregar ingrediente a la receta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (id: string) => {
    setSaving(true);
    try {
      await supabase.from('product_recipes').delete().eq('id', id);
      setRecipeLines(recipeLines.filter(line => line.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Cargando receta...</div>;

  return (
    <div className="flex flex-col h-full max-h-[60vh] overflow-hidden">
      <div className="p-6 bg-orange-50 border-b border-orange-100 flex items-start gap-4">
        <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
          <ChefHat size={24} />
        </div>
        <div>
          <h3 className="font-bold text-orange-900">Receta de {product.name}</h3>
          <p className="text-sm text-orange-800">
            Define qué insumos se descontarán automáticamente del inventario cada vez que se venda este producto.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {recipeLines.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>Este producto no tiene una receta configurada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipeLines.map(line => {
              const item = items.find(i => i.id === line.inventory_item_id);
              return (
                <div key={line.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="font-bold text-[#1F2933]">{item?.name || 'Insumo desconocido'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full text-sm">
                      {line.quantity_required} {item?.unit || ''}
                    </span>
                    <button 
                      onClick={() => handleDeleteLine(line.id)}
                      disabled={saving}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-200 bg-white">
        <form onSubmit={handleAddLine} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Insumo</label>
            <select
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="">Selecciona un insumo...</option>
              {items.map(item => (
                <option key={item.id} value={item.id} disabled={recipeLines.some(l => l.inventory_item_id === item.id)}>
                  {item.name} {item.is_compound ? '(Insumo Compuesto)' : `(${item.unit})`} {recipeLines.some(l => l.inventory_item_id === item.id) ? '- Ya agregado' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              placeholder="0.00"
            />
          </div>
          <button 
            type="submit" 
            disabled={saving || !selectedItemId || !quantity}
            className="bg-orange-500 text-white p-2.5 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
