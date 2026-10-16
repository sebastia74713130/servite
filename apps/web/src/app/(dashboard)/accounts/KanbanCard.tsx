'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { OrderStatus } from '@shared/types';
import { Clock, ChefHat, CheckCircle, GripVertical, Loader2, UtensilsCrossed } from 'lucide-react';

export interface FlatOrderItem {
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

interface KanbanCardProps {
  item: FlatOrderItem;
  onAdvance: (item: FlatOrderItem) => void;
  isUpdating: boolean;
  isOverlay?: boolean;
}

export function KanbanCard({ item, onAdvance, isUpdating, isOverlay = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled: isOverlay
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const status = item.order_status === 'sent' ? 'received' : item.order_status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border p-3 shadow-xs transition-all select-none ${
        isOverlay 
          ? 'shadow-2xl border-orange-400 rotate-1 scale-105 cursor-grabbing z-50' 
          : 'hover:shadow-md border-gray-200/80 hover:border-gray-300'
      }`}
    >
      {/* Top row: Quantity, Product Name, and Drag Handle */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5 sm:gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gray-100 text-gray-900 font-black text-[11px] sm:text-xs flex items-center justify-center">
            {item.quantity}x
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-2">
              {item.product_name}
            </h4>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-400 font-medium mt-0.5">
              <Clock size={11} className="flex-shrink-0" />
              <span className="truncate">
                {new Date(item.order_created_at).toLocaleTimeString('es-BO', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/La_Paz'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Drag handle */}
        {!isOverlay && (
          <div
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1 -mr-1 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0"
            title="Arrastra para mover de columna"
          >
            <GripVertical size={15} />
          </div>
        )}
      </div>

      {/* Notes if any */}
      {item.notes && (
        <p className="text-[10px] sm:text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md mt-1.5 font-medium border border-amber-100 line-clamp-2">
          Nota: {item.notes}
        </p>
      )}

      {/* Bottom row: Price and 1-Click Action Button */}
      <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
        <span className="font-black text-gray-900 text-xs whitespace-nowrap">
          Bs {item.total_price.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>

        {/* 1-Click Status Button */}
        <button
          type="button"
          disabled={isUpdating}
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(item);
          }}
          className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap ${
            status === 'received'
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              : status === 'preparing'
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              : status === 'ready'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
          }`}
          title="Clic para avanzar al siguiente estado"
        >
          {isUpdating ? (
            <Loader2 size={12} className="animate-spin text-current" />
          ) : status === 'received' ? (
            <>
              <ChefHat size={12} className="text-blue-600" />
              <span>Preparar ➔</span>
            </>
          ) : status === 'preparing' ? (
            <>
              <CheckCircle size={12} className="text-amber-600" />
              <span>Listo ➔</span>
            </>
          ) : status === 'ready' ? (
            <>
              <UtensilsCrossed size={12} className="text-emerald-600" />
              <span>Servir ➔</span>
            </>
          ) : (
            <>
              <CheckCircle size={12} className="text-gray-500" />
              <span>Servido ✓</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

