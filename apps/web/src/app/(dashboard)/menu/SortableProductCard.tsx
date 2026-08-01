import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Product } from '@shared/types';
import { GripVertical, Image as ImageIcon } from 'lucide-react';

function formatPrice(n: number) {
  return `Bs ${n.toLocaleString('es-BO')}`;
}

interface SortableProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onToggleAvailability: (p: Product) => void;
}

export function SortableProductCard({ product, onEdit, onToggleAvailability }: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, data: { type: 'Product', product } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(product)}
      className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex gap-3 hover:shadow-md hover:border-[#E76F51]/30 transition-all cursor-pointer group relative items-center"
    >
      <div 
        {...attributes} 
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#1F2933] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={16} />
      </div>

      <div className="w-14 h-14 ml-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon size={20} className="text-[#D1D5DB]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[#1F2933] text-sm leading-tight line-clamp-2">{product.name}</h3>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAvailability(product); }}
            className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              product.is_available
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {product.is_available ? 'Disponible' : 'Agotado'}
          </button>
        </div>
        <p className="font-bold text-[#E76F51] text-sm mt-1">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}
