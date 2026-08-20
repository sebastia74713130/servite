'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSiatPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [syncCount, setSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncTarget, setSyncTarget] = useState(1800);

  const [emitCount, setEmitCount] = useState(0);
  const [emitting, setEmitting] = useState(false);
  const [emitTarget, setEmitTarget] = useState(250);

  useEffect(() => {
    // Get the first restaurant of the user to run tests
    async function loadRestaurant() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('restaurant_users')
        .select('restaurant_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();
      
      if (data) setRestaurantId(data.restaurant_id);
    }
    loadRestaurant();
  }, []);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const runSyncTests = async () => {
    if (!restaurantId) return;
    setSyncing(true);
    let successCount = 0;

    for (let i = 0; i < syncTarget; i++) {
      if (!syncing && i > 0) break; // Allow manual stop but state is tricky in loop, we check a ref normally, but for simplicity we just let it run or rely on simple bool if we implemented a stop button.
      try {
        const res = await fetch('/api/siat/sincronizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId })
        });
        if (res.ok) {
          successCount++;
          setSyncCount(successCount);
        }
      } catch (e) {
        console.error(e);
      }
      // Wait 100ms between requests to avoid DDoS protection
      await delay(100);
    }
    setSyncing(false);
  };

  const runEmitTests = async () => {
    if (!restaurantId) return;
    setEmitting(true);
    let successCount = 0;

    for (let i = 0; i < emitTarget; i++) {
      try {
        // Generar una orden falsa al vuelo
        const facturaParams = {
          cabecera: {
            numeroFactura: Math.floor(Math.random() * 1000000) + 1,
            fechaEmision: new Date().toISOString(), // Será reemplazado por la API
            numeroDocumento: "1234567",
            montoTotal: 100,
            montoTotalSujetoIva: 100,
            montoTotalMoneda: 100,
          },
          detalle: [
            {
              descripcion: "Producto de Prueba",
              cantidad: 1,
              precioUnitario: 100,
              subTotal: 100,
              montoDescuento: 0
            }
          ]
        };

        const res = await fetch('/api/siat/emitir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            restaurantId, 
            orderId: null, 
            facturaParams 
          })
        });
        
        if (res.ok) {
          successCount++;
          setEmitCount(successCount);
        }
      } catch (e) {
        console.error(e);
      }
      // Wait 200ms between emission requests
      await delay(200);
    }
    setEmitting(false);
  };

  if (!restaurantId) return <div className="p-10">Cargando restaurante...</div>;

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Automatización Pruebas Piloto SIAT</h1>
      <p className="text-gray-600">Esta página interna permite ejecutar las miles de transacciones requeridas por Impuestos Nacionales para alcanzar el 100% en las Etapas de prueba.</p>

      {/* Sincronización */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">1. Etapa II - Sincronización de Catálogos (1800 requeridos)</h2>
        <div className="flex items-center gap-4 mb-4">
          <input 
            type="number" 
            value={syncTarget} 
            onChange={e => setSyncTarget(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 w-32"
          />
          <button 
            onClick={runSyncTests}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : 'Iniciar Sincronización Masiva'}
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(100, (syncCount / syncTarget) * 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Completados: {syncCount} / {syncTarget}</p>
      </div>

      {/* Emisión */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">2. Etapa IV - Emisión Individual (250 requeridos)</h2>
        <div className="flex items-center gap-4 mb-4">
          <input 
            type="number" 
            value={emitTarget} 
            onChange={e => setEmitTarget(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 w-32"
          />
          <button 
            onClick={runEmitTests}
            disabled={emitting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {emitting ? 'Emitiendo...' : 'Iniciar Emisión Masiva'}
          </button>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-green-600 h-4 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(100, (emitCount / emitTarget) * 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Completados: {emitCount} / {emitTarget}</p>
      </div>
    </div>
  );
}
