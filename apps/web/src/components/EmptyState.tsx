"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[#F9FAFB] flex items-center justify-center mb-6">
        <Icon size={40} className="text-[#E5E7EB]" />
      </div>
      <h3 className="text-xl font-bold text-[#1F2933] mb-2">{title}</h3>
      <p className="text-[#6B7280] max-w-md">{subtitle}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-8 bg-[#E76F51] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#d65e40] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
