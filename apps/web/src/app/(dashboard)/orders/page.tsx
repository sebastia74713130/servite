"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/LoadingState";

export default function OrdersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirige a la sección unificada de Mesas y Pedidos (/accounts)
    router.replace("/accounts");
  }, [router]);

  return <LoadingState />;
}
