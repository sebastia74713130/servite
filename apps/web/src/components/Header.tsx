"use client";

import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { Menu } from "lucide-react";

export function Header({ toggleSidebar }: { toggleSidebar?: () => void }) {
  const { restaurant, branch } = useRestaurantSession();

  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-[#E5E7EB] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 lg:ml-64 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-4">
        {toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-[#6B7280] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        )}
        <div>
          <h2 className="text-xl font-bold text-[#1F2933]">
            {restaurant?.name || "Cargando..."}
          </h2>
          {branch && (
            <p className="text-sm text-[#6B7280]">{branch.name}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#1F2933]">
          {restaurant?.name?.charAt(0) || "R"}
        </div>
      </div>
    </header>
  );
}
