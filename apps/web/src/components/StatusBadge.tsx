"use client";

import { ORDER_STATUS_LABELS_RESTAURANT } from "@shared/constants";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const bgColors: Record<string, string> = {
    sent: "bg-blue-100 text-blue-800",
    received: "bg-yellow-100 text-yellow-800",
    preparing: "bg-orange-100 text-orange-800",
    ready: "bg-green-100 text-green-800",
    delivered: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const label = ORDER_STATUS_LABELS_RESTAURANT[status] || status;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgColors[status] || bgColors.sent}`}>
      {label}
    </span>
  );
}
