'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';

export default function TestSiatPage() {
  const { restaurant, loading } = useRestaurantSession();
  const restaurantId = restaurant?.id;
  
  const [syncCount, setSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncTarget, setSyncTarget] = useState(1800);
  const [currentSyncMethod, setCurrentSyncMethod] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/siat/robot/methods')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAvailableMethods(data.methods);
        }
      });
  }, []);

  const [emitCount, setEmitCount] = useState(0);
  const [emitting, setEmitting] = useState(false);
  const [emitTarget, setEmitTarget] = useState(250);

  const [cuisPv1Status, setCuisPv1Status] = useState<string>('');
  const [requestingCuis, setRequestingCuis] = useState(false);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const runSyncTests = async () => {
    if (!restaurantId) return;
    setSyncing(true);
    let successCount = 0;

    try {
      // 1. Obtener lista de métodos disponibles en el WSDL
      const methodsRes = await fetch('/api/siat/robot/methods');
      const methodsData = await methodsRes.json();
      
      if (!methodsData.success) {
        console.error("Error obteniendo métodos", methodsData.error);
        setSyncing(false);
        return;
      }
      
      const methods: string[] = selectedMethod === 'all' 
        ? methodsData.methods 
        : [selectedMethod];
      
      const requiredPerMethod = syncTarget / methods.length;

      // 2. Ejecutar cada método 50 veces
      for (const methodName of methods) {
        for (let i = 0; i < requiredPerMethod; i++) {
          if (!syncing && successCount > 0) break; // Allow manual stop logic
          
          setCurrentSyncMethod(`${methodName} (${i + 1}/${requiredPerMethod})`);
          
          try {
            const res = await fetch('/api/siat/robot/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ restaurantId, methodName })
            });
            
            if (res.ok) {
              successCount++;
              setSyncCount(successCount);
            } else {
               const errData = await res.json();
               console.error(`Error en ${methodName}:`, errData);
            }
          } catch (e) {
            console.error(e);
          }
          // Aumentado a 1000ms (1 segundo) para evitar cualquier tipo de bloqueo o rechazo por saturación del SIAT
          await delay(1000);
        }
      }
    } catch (error) {
      console.error(error);
    }
    
    setSyncing(false);
    setCurrentSyncMethod('');
  };

  const runEmitTests = async () => {
    if (!restaurantId) return;
    setEmitting(true);
    let successCount = 0;

    for (let i = 0; i < emitTarget; i++) {
      if (!emitting && successCount > 0) break;
      
      try {
        // Generar una orden falsa al vuelo
        const facturaParams = {
          cabecera: {
            numeroFactura: Math.floor(Math.random() * 1000000) + 1,
            fechaEmision: new Date().toISOString(),
            codigoTipoDocumentoIdentidad: 1, // 1 = CI
            numeroDocumento: "1234567",
            codigoExcepcion: 0,
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
      
      // Wait 1000ms between emission batches
      await delay(1000);
    }
    setEmitting(false);
  };

  if (loading || !restaurantId) return <div className="p-10">Cargando restaurante...</div>;

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Automatización Pruebas Piloto SIAT</h1>
      <p className="text-gray-600">Esta página interna permite ejecutar las miles de transacciones requeridas por Impuestos Nacionales para alcanzar el 100% en las Etapas de prueba.</p>

      {/* Etapa I - Obtención de CUIS para P.V. 1 */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">0. Etapa I - Obtención de CUIS (Punto de Venta 1)</h2>
        <p className="text-sm text-gray-500 mb-4">El SIAT requiere solicitar al menos una vez un CUIS para el Punto de Venta 1.</p>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              if (!restaurantId) return;
              setRequestingCuis(true);
              setCuisPv1Status('Solicitando...');
              try {
                const res = await fetch('/api/siat/cuis', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ restaurantId, overridePuntoVenta: 1 })
                });
                if (res.ok) {
                  setCuisPv1Status('Completado (100%)');
                } else {
                  const errorData = await res.json();
                  setCuisPv1Status(`Error: ${errorData.error}`);
                }
              } catch (e: any) {
                setCuisPv1Status(`Error: ${e.message}`);
              }
              setRequestingCuis(false);
            }}
            disabled={requestingCuis}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {requestingCuis ? 'Solicitando...' : 'Solicitar CUIS para P.V. 1'}
          </button>
          <span className="text-sm font-medium text-gray-700">{cuisPv1Status}</span>
        </div>
      </div>

      {/* Sincronización */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">1. Etapa II - Sincronización de Catálogos</h2>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <select
            value={selectedMethod}
            onChange={e => {
              setSelectedMethod(e.target.value);
              setSyncTarget(e.target.value === 'all' ? availableMethods.length * 50 : 50);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 w-64 bg-white"
          >
            <option value="all">TODOS LOS CATÁLOGOS (1800)</option>
            {availableMethods.map(m => (
              <option key={m} value={m}>{m} (50)</option>
            ))}
          </select>
          <input 
            type="number" 
            value={syncTarget} 
            onChange={e => setSyncTarget(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 w-24"
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
        {currentSyncMethod && (
          <p className="text-sm text-blue-600 font-medium mt-1 animate-pulse">Ejecutando: {currentSyncMethod}</p>
        )}
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
