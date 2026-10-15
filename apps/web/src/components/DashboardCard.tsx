"use client";

import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  badgeColor?: "blue" | "gold" | "terracotta" | "green" | "gray" | "purple";
  subtitle?: string;
  hint?: {
    text: string;
    onClick?: () => void;
  };
}

export function DashboardCard({ title, value, icon: Icon, badgeColor = "gray", subtitle, hint }: DashboardCardProps) {
  const bgColors = {
    blue: "bg-[#EFF6FF]",
    gold: "bg-[#FEF3CD]",
    terracotta: "bg-[#FDF0EC]",
    green: "bg-[#EDF7ED]",
    gray: "bg-[#F9FAFB]",
    purple: "bg-[#F3E8FF]"
  };
  
  const iconColors = {
    blue: "text-[#3B82F6]",
    gold: "text-[#F4B942]",
    terracotta: "text-[#E76F51]",
    green: "text-[#2E7D32]",
    gray: "text-[#6B7280]",
    purple: "text-[#9333EA]"
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm flex items-start space-x-4 hover:shadow-md hover:border-[#2F4F3E]/30 transition-all cursor-default group">
      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${bgColors[badgeColor]} group-hover:scale-105 transition-transform mt-0.5`}>
        <Icon size={26} className={iconColors[badgeColor]} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[#6B7280] font-medium text-xs tracking-wide uppercase">{title}</h3>
        <p className="text-2xl font-bold text-[#1F2933] mt-0.5 truncate">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
        )}
        {hint && (
          <button 
            type="button"
            onClick={hint.onClick}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1 transition-colors"
          >
            {hint.text}
          </button>
        )}
      </div>
    </div>
  );
}
