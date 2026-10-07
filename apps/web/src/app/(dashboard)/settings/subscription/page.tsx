'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PLAN_FEATURES = {
  BASIC: [
    'Hasta 1 Sucursal',
    'Menú Digital QR',
    'Gestión de Pedidos',
    'Toma de pedidos en mesa',
    'Soporte estándar'
  ],
  PRO: [
    'Múltiples Sucursales',
    'Menú Digital QR',
    'Control de Inventario',
    'Reportes Avanzados',
    'Gestión de Personal',
    'Soporte prioritario'
  ],
  FULL: [
    'Todo lo de PRO',
    'Múltiples Sucursales Ilimitadas',
    'Integración POS Avanzada',
    'Facturación Electrónica (Próximamente)',
    'Onboarding personalizado',
    'Soporte 24/7'
  ]
};

const PLAN_PRICES = {
  BASIC: 500,
  PRO: 1300,
  FULL: 1800
};

export default function SubscriptionPage() {
  const { restaurant, loading } = useRestaurantSession();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && qrId) {
      handleCancelQr();
    }
  }, [timeLeft, qrId]);

  const handleSelectPlan = async (plan: 'BASIC' | 'PRO' | 'FULL') => {
    if (!restaurant) return;
    setGenerating(true);
    setSelectedPlan(plan);
    setQrImage(null);
    setQrId(null);
    if (pollingInterval) clearInterval(pollingInterval);

    try {
      const res = await fetch('/api/qr/subscription/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          plan: plan,
          amount: PLAN_PRICES[plan]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando QR');

      setQrImage(data.qrImage);
      setQrId(data.qrId);
      setTimeLeft(600); // 10 minutes

      // Start polling
      const interval = setInterval(() => checkPaymentStatus(data.qrId, plan), 5000);
      setPollingInterval(interval);

    } catch (error: any) {
      console.error(error);
      alert(error.message);
      setSelectedPlan(null);
    } finally {
      setGenerating(false);
    }
  };

  const checkPaymentStatus = async (id: string, plan: string) => {
    try {
      const res = await fetch('/api/qr/subscription/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId: id, restaurantId: restaurant.id, plan })
      });
      const data = await res.json();

      if (data.paid) {
        if (pollingInterval) clearInterval(pollingInterval);
        alert('¡Pago verificado! Tu suscripción ha sido activada.');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (error) {
      console.error('Error verificando pago:', error);
    }
  };

  const handleCancelQr = async () => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (qrId) {
      try {
        await fetch('/api/qr/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrId })
        });
      } catch (error) {
        console.error('Error cancelando QR:', error);
      }
    }
    setQrImage(null);
    setQrId(null);
    setSelectedPlan(null);
    setTimeLeft(0);
    alert('El tiempo para pagar ha expirado o ha sido cancelado.');
  };

  if (loading || !restaurant) return null;

  const isActive = restaurant.subscription_status === 'active';
  const expiresAt = restaurant.subscription_expires_at ? new Date(restaurant.subscription_expires_at).toLocaleDateString() : 'N/A';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Planes de Suscripción</h1>
        <p className="text-xl text-gray-500">
          Elige el plan que mejor se adapte a tu negocio para empezar a operar.
        </p>
        
        {isActive && (
          <div className="mt-6 inline-block bg-green-50 text-green-700 px-6 py-3 rounded-full font-medium border border-green-200">
            Suscripción actual: <span className="font-bold">{restaurant.subscription_plan}</span> - Vence el {expiresAt}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* BASIC */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900">Basic</h3>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900">
              500Bs
              <span className="ml-1 text-xl font-medium text-gray-500">/mes</span>
            </div>
            <p className="mt-4 text-gray-500">Ideal para restaurantes pequeños que recién comienzan.</p>
          </div>
          <div className="px-8 pb-8 flex-1 flex flex-col">
            <ul className="space-y-4 flex-1">
              {PLAN_FEATURES.BASIC.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mr-3" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan('BASIC')}
              disabled={generating || (isActive && restaurant.subscription_plan === 'BASIC')}
              className="mt-8 w-full bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActive && restaurant.subscription_plan === 'BASIC' ? 'Plan Actual' : 'Elegir Basic'}
            </button>
          </div>
        </div>

        {/* PRO */}
        <div className="bg-[#E76F51] rounded-3xl shadow-lg border-2 border-[#E76F51] overflow-hidden transform md:-translate-y-4 flex flex-col relative">
          <div className="absolute top-0 right-0 bg-white text-[#E76F51] text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wide">
            Más Popular
          </div>
          <div className="p-8 text-white">
            <h3 className="text-2xl font-bold">Pro</h3>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold">
              1300Bs
              <span className="ml-1 text-xl font-medium text-white/80">/mes</span>
            </div>
            <p className="mt-4 text-white/80">Para restaurantes en crecimiento que necesitan más control.</p>
          </div>
          <div className="px-8 pb-8 flex-1 flex flex-col bg-white">
            <ul className="space-y-4 flex-1 mt-6">
              {PLAN_FEATURES.PRO.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <Check className="h-5 w-5 text-[#E76F51] shrink-0 mr-3" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan('PRO')}
              disabled={generating || (isActive && restaurant.subscription_plan === 'PRO')}
              className="mt-8 w-full bg-[#E76F51] text-white rounded-xl py-3 font-semibold hover:bg-[#d65e40] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActive && restaurant.subscription_plan === 'PRO' ? 'Plan Actual' : 'Elegir Pro'}
            </button>
          </div>
        </div>

        {/* FULL */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900">Full</h3>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900">
              1800Bs
              <span className="ml-1 text-xl font-medium text-gray-500">/mes</span>
            </div>
            <p className="mt-4 text-gray-500">Para franquicias y restaurantes con alto volumen.</p>
          </div>
          <div className="px-8 pb-8 flex-1 flex flex-col">
            <ul className="space-y-4 flex-1">
              {PLAN_FEATURES.FULL.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mr-3" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSelectPlan('FULL')}
              disabled={generating || (isActive && restaurant.subscription_plan === 'FULL')}
              className="mt-8 w-full bg-gray-900 text-white rounded-xl py-3 font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActive && restaurant.subscription_plan === 'FULL' ? 'Plan Actual' : 'Elegir Full'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal QR */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center relative shadow-2xl">
            <button 
              onClick={handleCancelQr}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-2">Pago de Suscripción</h2>
            <p className="text-gray-500 mb-6">Escanea el QR para activar tu plan {selectedPlan}</p>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E76F51] mb-4"></div>
                <p className="text-gray-500">Generando QR de pago...</p>
              </div>
            ) : qrImage ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 inline-block">
                  <img src={`data:image/png;base64,${qrImage}`} alt="QR Code" className="w-64 h-64 object-contain" />
                </div>
                
                <div className="text-4xl font-bold text-gray-900 mb-4">
                  {PLAN_PRICES[selectedPlan as keyof typeof PLAN_PRICES]} Bs
                </div>

                <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium mb-6 w-full">
                  El QR expira en: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  Esperando pago...
                </div>
              </div>
            ) : (
              <div className="py-12">
                <p className="text-red-500">Hubo un error al generar el QR.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
