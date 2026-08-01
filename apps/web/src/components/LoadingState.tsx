"use client";

import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full py-20 text-[#6B7280] animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-12 h-12 bg-[#E76F51]/20 rounded-full animate-ping" />
        <div className="relative bg-white rounded-full p-3 shadow-sm border border-[#E5E7EB]">
          <Loader2 className="animate-spin text-[#E76F51]" size={28} />
        </div>
      </div>
      <p className="text-lg font-medium bg-gradient-to-r from-[#1F2933] to-[#4B5563] bg-clip-text text-transparent animate-pulse">{message}</p>
    </div>
  );
}
