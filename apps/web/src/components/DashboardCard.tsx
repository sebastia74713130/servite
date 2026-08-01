"use client";

import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  badgeColor?: "blue" | "gold" | "terracotta" | "green" | "gray";
}

export function DashboardCard({ title, value, icon: Icon, badgeColor = "gray" }: DashboardCardProps) {
  const bgColors = {
    blue: "bg-[#EFF6FF]",
    gold: "bg-[#FEF3CD]",
    terracotta: "bg-[#FDF0EC]",
    green: "bg-[#EDF7ED]",
    gray: "bg-[#F9FAFB]"
  };
  
  const iconColors = {
    blue: "text-[#3B82F6]",
    gold: "text-[#F4B942]",
    terracotta: "text-[#E76F51]",
    green: "text-[#2E7D32]",
    gray: "text-[#6B7280]"
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex items-center space-x-4 hover:shadow-md hover:border-[#E76F51]/30 transition-all cursor-default group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${bgColors[badgeColor]} group-hover:scale-110 transition-transform`}>
        <Icon size={28} className={iconColors[badgeColor]} />
      </div>
      <div>
        <h3 className="text-[#6B7280] font-medium text-sm">{title}</h3>
        <p className="text-3xl font-bold text-[#1F2933] mt-1">{value}</p>
      </div>
    </div>
  );
}
