'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { FileText, AlertCircle, CheckCircle, XCircle, Search, RefreshCw, WifiOff, CloudUpload } from 'lucide-react';

export default function InvoicesPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isAnulling, setIsAnulling] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  useEffect(() => {
    if (restaurant?.id && branch?.id) {
      fetchInvoices();
    }
  }, [restaurant?.id, branch?.id]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/siat/invoices?restaurantId=${restaurant?.id}&branchId=${branch?.id || ''}`);
      const json = await res.json();
      
      if (json.error) throw new Error(json.error);
      setInvoices(json.invoices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOffline = async () => {
    setIsSyncingOffline(true);
    try {
      // 1. Enviar facturas offline en paquete al SIAT
      const syncRes = await fetch('/api/siat/sincronizar-offline');
      const syncData = await syncRes.json();
      
      // 2. Validar paquetes pendientes
      const valRes = await fetch('/api/siat/validar-paquetes');
      const valData = await valRes.json();

      await fetchInvoices();
      alert(`Sincronización completada:\n- Envío: ${syncData.message || (syncData.logs?.join('\n') || 'Procesado')}\n- Validación: ${valData.message || (valData.logs?.join('\n') || 'Procesado')}`);
    } catch (err: any) {
      console.error('Error sincronizando facturas fuera de línea:', err);
      alert('Error al conectar con el servicio de sincronización offline.');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const handleAnular = async (cuf: string) => {
    if (!confirm('¿Estás seguro de anular esta factura en el SIAT? Esta acción es irreversible.')) return;
    
    setIsAnulling(cuf);
    try {
      const res = await fetch('/api/siat/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant?.id,
          cuf: cuf,
          codigoMotivoAnulacion: 1
        })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Factura anulada exitosamente');
        fetchInvoices();
      } else {
        alert(`Error al anular: ${JSON.stringify(data.detalles || data.error)}`);
      }
    } catch (err: any) {
      alert('Error de red al anular factura');
    } finally {
      setIsAnulling(null);
    }
  };

  const handleRevertir = async (cuf: string) => {
    if (!confirm('¿Estás seguro de revertir la anulación de esta factura en el SIAT? Volverá a ser válida.')) return;
    
    setIsAnulling(cuf);
    try {
      const res = await fetch('/api/siat/revertir-anulacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant?.id,
          cuf: cuf
        })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Anulación revertida exitosamente');
        fetchInvoices();
      } else {
        alert(`Error al revertir: ${JSON.stringify(data.detalles || data.error)}`);
      }
    } catch (err: any) {
      alert('Error de red al revertir anulación');
    } finally {
      setIsAnulling(null);
    }
  };

  if (sessionLoading || loading) return <LoadingState />;

  const filteredInvoices = invoices.filter(inv => 
    inv.cuf?.toLowerCase().includes(search.toLowerCase()) || 
    inv.numero_factura?.toString().includes(search)
  );

  const offlineCount = invoices.filter(inv => inv.siat_estado?.includes('OFFLINE')).length;
  const packageCount = invoices.filter(inv => inv.siat_estado === 'PAQUETE_ENVIADO').length;
  const validatedCount = invoices.filter(inv => inv.siat_estado === 'VALIDADA').length;
  const annuledCount = invoices.filter(inv => inv.siat_estado === 'ANULADA').length;

  return (
    <div className="p-8 max-w-7xl mx-auto h-[100vh] overflow-y-auto pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Facturas SIAT</h1>
          <p className="text-gray-500 mt-1">Historial de emisiones, contingencias y anulaciones</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSyncOffline}
            disabled={isSyncingOffline}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={isSyncingOffline ? 'animate-spin' : ''} />
            <span>{isSyncingOffline ? 'Sincronizando...' : 'Sincronizar Offline'}</span>
          </button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Nro o CUF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E76F51]/20 focus:border-[#E76F51]"
            />
          </div>
        </div>
      </div>

      {/* Resumen de métricas de facturación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Validadas en SIAT</p>
            <p className="text-2xl font-black text-green-600 mt-1">{validatedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Pendientes Offline</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{offlineCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <WifiOff size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">En Paquetes SIAT</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{packageCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CloudUpload size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Anuladas</p>
            <p className="text-2xl font-black text-red-600 mt-1">{annuledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Alerta de contingencia */}
      {(offlineCount > 0 || packageCount > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {offlineCount > 0
                  ? `Tienes ${offlineCount} factura(s) emitida(s) en contingencia (Offline)`
                  : `Tienes ${packageCount} paquete(s) en espera de confirmación del SIAT`}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Vercel Cron las transmite automáticamente a medianoche, o puedes sincronizarlas de inmediato.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncOffline}
            disabled={isSyncingOffline}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
          >
            <RefreshCw size={16} className={isSyncingOffline ? 'animate-spin' : ''} />
            <span>{isSyncingOffline ? 'Transmitiendo...' : 'Sincronizar con SIAT Ahora'}</span>
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="py-4 px-6 font-bold text-gray-600 text-sm">Nro</th>
              <th className="py-4 px-6 font-bold text-gray-600 text-sm">Fecha</th>
              <th className="py-4 px-6 font-bold text-gray-600 text-sm">Cliente</th>
              <th className="py-4 px-6 font-bold text-gray-600 text-sm">Monto</th>
              <th className="py-4 px-6 font-bold text-gray-600 text-sm">Estado</th>
              <th className="py-4 px-6 font-bold text-gray-600 text-sm text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6 text-sm font-bold text-gray-900">
                  {inv.numero_factura || '-'}
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">
                  {new Date(inv.created_at).toLocaleString('es-BO')}
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">
                  {inv.orders?.customer_name || 'S/N'}<br/>
                  <span className="text-xs text-gray-400">NIT: {inv.orders?.customer_nit || 'S/N'}</span>
                </td>
                <td className="py-4 px-6 text-sm font-bold text-gray-900">
                  Bs {inv.orders?.total?.toLocaleString('es-BO') || 0}
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                    ${inv.siat_estado === 'VALIDADA' ? 'bg-green-100 text-green-700' :
                      inv.siat_estado === 'ANULADA' ? 'bg-red-100 text-red-700' :
                      inv.siat_estado?.includes('OFFLINE') ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'}
                  `}>
                    {inv.siat_estado === 'VALIDADA' ? <CheckCircle size={14}/> :
                     inv.siat_estado === 'ANULADA' ? <XCircle size={14}/> : <AlertCircle size={14}/>}
                    {inv.siat_estado}
                  </span>
                </td>
                <td className="py-4 px-6 text-right space-x-2">
                  <button 
                    onClick={() => window.open(`/api/siat/factura/print?cuf=${inv.cuf}`, '_blank')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <FileText size={16} /> Ver
                  </button>
                  {inv.siat_estado !== 'ANULADA' && (
                    <button 
                      disabled={isAnulling === inv.cuf}
                      onClick={() => handleAnular(inv.cuf)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isAnulling === inv.cuf ? 'Anulando...' : 'Anular'}
                    </button>
                  )}
                  {inv.siat_estado === 'ANULADA' && (
                    <button 
                      disabled={isAnulling === inv.cuf}
                      onClick={() => handleRevertir(inv.cuf)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isAnulling === inv.cuf ? 'Revirtiendo...' : 'Revertir'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No se encontraron facturas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
