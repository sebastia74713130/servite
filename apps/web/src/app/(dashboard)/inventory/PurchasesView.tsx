import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@shared/types';
import { ShoppingCart, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export function PurchasesView({ restaurantId, branchId }: { restaurantId: string; branchId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    supabase.from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setItems(data);
      });
  }, [restaurantId, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !quantity || !totalCost) return;
    setLoading(true);
    setSuccessMsg('');

    try {
      let receiptUrl = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${restaurantId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);
          
        if (!uploadError) {
          const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
          receiptUrl = data.publicUrl;
        }
      }

      const selectedItem = items.find(i => i.id === selectedItemId);
      if (!selectedItem) throw new Error("Item no encontrado");

      const qtyNum = parseFloat(quantity);
      const newStock = Number(selectedItem.current_stock) + qtyNum;

      // 1. Update stock
      await supabase.from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', selectedItemId);

      // 2. Insert into inventory_movements
      await supabase.from('inventory_movements').insert({
        restaurant_id: restaurantId,
        inventory_item_id: selectedItemId,
        movement_type: 'purchase',
        quantity: qtyNum,
        previous_stock: selectedItem.current_stock,
        new_stock: newStock,
        notes: notes || 'Ingreso manual por compras'
      });

      // 3. Register expense
      await supabase.from('expenses').insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        amount: parseFloat(totalCost),
        description: `Compra de ${selectedItem.name} (${qtyNum} ${selectedItem.unit})`,
        category: 'Insumos',
        payment_method: 'Efectivo', // Simplified for MVP
      });

      // 4. (Optional) save a fake purchase_list record just to keep the receipt URL
      if (receiptUrl) {
         await supabase.from('purchase_lists').insert({
           restaurant_id: restaurantId,
           branch_id: branchId,
           status: 'completed',
           total_cost: parseFloat(totalCost),
           notes: notes,
           receipt_url: receiptUrl
         });
      }

      setSuccessMsg('Ingreso registrado con éxito');
      
      // Reset form
      setSelectedItemId('');
      setQuantity('');
      setTotalCost('');
      setReceiptFile(null);
      setNotes('');
      
    } catch (error) {
      console.error(error);
      alert('Error al registrar la compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <ShoppingCart className="text-[#E76F51]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1F2933]">Registrar Ingreso de Mercadería</h2>
          <p className="text-gray-500 text-sm">Actualiza el stock y registra el gasto de la compra.</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Insumo</label>
            <select
              required
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5 bg-white"
            >
              <option value="">Selecciona un insumo...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Cantidad Ingresante</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5"
              placeholder="Ej: 10"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Costo Total (Bs.)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={totalCost}
              onChange={e => setTotalCost(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5"
              placeholder="Ej: 150.50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Notas (Opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5"
              placeholder="Proveedor, marca, etc."
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Comprobante o Factura (Opcional)</label>
          <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*,application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
            {receiptFile ? (
              <div className="flex items-center gap-2 text-[#2F4F3E]">
                <ImageIcon size={20} />
                <span className="font-medium">{receiptFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="text-gray-400 mb-2" size={24} />
                <span className="text-sm text-gray-500 font-medium">Click para subir foto del recibo</span>
              </>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#E76F51] hover:bg-[#E76F51]/90 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Procesando...' : 'Registrar Ingreso'}
          </button>
        </div>
      </form>
    </div>
  );
}

