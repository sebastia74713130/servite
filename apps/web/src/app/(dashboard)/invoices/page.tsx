'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { FileText, AlertCircle, CheckCircle, XCircle, Search } from 'lucide-react';

export default function InvoicesPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isAnulling, setIsAnulling] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchInvoices();
    }
  }, [restaurant?.id]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, orders(id, table_number, total, customer_name, customer_nit)')
        .eq('restaurant_id', restaurant?.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  if (sessionLoading || loading) return <LoadingState />;

  const filteredInvoices = invoices.filter(inv => 
    inv.cuf?.toLowerCase().includes(search.toLowerCase()) || 
    inv.numero_factura?.toString().includes(search)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-[100vh] overflow-y-auto pb-32">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Facturas SIAT</h1>
          <p className="text-gray-500 mt-1">Historial de emisiones y anulaciones</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por Nro o CUF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E76F51]/20 focus:border-[#E76F51] w-64"
          />
        </div>
      </div>

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
