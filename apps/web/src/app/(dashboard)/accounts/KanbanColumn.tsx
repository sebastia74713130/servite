'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  theme: {
    headerBg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  batchAction?: {
    label: string;
    onClick: () => void;
    loading: boolean;
    icon?: React.ReactNode;
  };
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  icon,
  count,
  theme,
  batchAction,
  children
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all h-full w-full min-w-0 ${theme.border} ${
        isOver ? 'bg-orange-50/70 ring-2 ring-orange-400 border-orange-300' : 'bg-gray-50/70'
      }`}
    >
      {/* Column Header */}
      <div className={`p-2.5 sm:p-3 border-b flex items-center justify-between rounded-t-2xl ${theme.headerBg} ${theme.border}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex-shrink-0">{icon}</span>
          <h3 className="font-black text-[11px] sm:text-xs text-gray-800 uppercase tracking-wide truncate">
            {title}
          </h3>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black flex-shrink-0 ${theme.badgeBg} ${theme.badgeText}`}>
          {count}
        </span>
      </div>

      {/* Batch Action Bar if applicable (e.g. "Pasar todo a preparación") */}
      {batchAction && count > 0 && (
        <div className="p-2 border-b border-gray-100 bg-white">
          <button
            type="button"
            disabled={batchAction.loading}
            onClick={batchAction.onClick}
            className="w-full py-1.5 px-2.5 bg-[#E76F51] hover:bg-[#d65e40] text-white font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {batchAction.loading ? (
              <Loader2 size={13} className="animate-spin text-white" />
            ) : (
              batchAction.icon
            )}
            <span>{batchAction.loading ? 'Actualizando...' : batchAction.label}</span>
          </button>
        </div>
      )}

      {/* Droppable Cards Container */}
      <div className="flex-1 p-2 space-y-2.5 overflow-y-auto min-h-[160px]">
        {count === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
            <span>Sin productos</span>
            <span className="text-[10px] text-gray-300 mt-0.5">Arrastra aquí</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

