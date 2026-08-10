'use client';

import { useState, useRef } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { useTables } from '@/hooks/useTables';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { RestaurantTable } from '@shared/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus,
  X,
  Eye,
  Download,
  Printer,
  QrCode,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function TablesPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const { tables, loading: tablesLoading, refetch } = useTables(restaurant?.id, branch?.id);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  if (sessionLoading || tablesLoading) return <LoadingState />;

  const handleToggleActive = async (table: RestaurantTable) => {
    await supabase
      .from('tables')
      .update({ is_active: !table.is_active })
      .eq('id', table.id);
    refetch();
  };

  const openQr = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowQrModal(true);
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2933]">Mesas</h1>
          <p className="text-[#6B7280] text-sm mt-1">{tables.length} mesa{tables.length !== 1 ? 's' : ''} registrada{tables.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-[#E76F51] text-white rounded-xl px-5 py-2.5 font-medium hover:bg-[#D4604A] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nueva mesa
        </button>
      </div>

      {/* grid */}
      {tables.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col items-center justify-center py-20 text-[#6B7280]">
          <QrCode size={48} className="mb-4 opacity-30" />
          <p className="font-medium">No hay mesas todavía</p>
          <p className="text-sm mt-1">Crea tu primera mesa para generar su código QR</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map(table => (
            <div
              key={table.id}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#E76F51]/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#1F2933]">
                      {table.type === 'takeaway' ? 'Mostrador' : 'Mesa'} {table.table_number}
                    </h2>
                    {table.type === 'takeaway' && (
                      <span className="text-[10px] uppercase font-bold bg-[#1F2933] text-white px-2 py-0.5 rounded-md tracking-wider">
                        Barra
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#6B7280] font-mono mt-1">{table.table_code}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  table.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {table.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* mini QR preview */}
              <div className="flex justify-center mb-4 p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <QRCodeSVG
                  value={typeof window !== 'undefined' && restaurant ? `${window.location.origin}/m/${restaurant.slug}/${table.table_code}` : ''}
                  size={100}
                  level="H"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openQr(table)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-[#E76F51] text-[#E76F51] rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#FDF0EC] transition-colors"
                >
                  <Eye size={14} />
                  Ver QR
                </button>

                <button
                  onClick={() => openQr(table)}
                  className="flex items-center justify-center gap-1.5 border border-[#E5E7EB] text-[#6B7280] rounded-lg px-3 py-2 text-sm hover:text-[#1F2933] hover:border-[#1F2933]/30 transition-colors"
                  title="Descargar QR"
                >
                  <Download size={14} />
                </button>

                <button
                  onClick={() => handleToggleActive(table)}
                  className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-colors ${
                    table.is_active
                      ? 'border border-green-200 text-green-600 hover:bg-green-50'
                      : 'border border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${
                    table.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
                      table.is_active ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && selectedTable && restaurant && (
        <QrModal
          table={selectedTable}
          restaurantSlug={restaurant.slug}
          onClose={() => { setShowQrModal(false); setSelectedTable(null); }}
        />
      )}

      {/* New Table Modal */}
      {showNewModal && (
        <NewTableModal
          restaurantId={restaurant?.id}
          branchId={branch?.id}
          onClose={() => setShowNewModal(false)}
          onSaved={() => { setShowNewModal(false); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─── QR Modal ───────────────────────────────────────────────────── */
function QrModal({ table, restaurantSlug, onClose }: { table: RestaurantTable; restaurantSlug: string; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Usamos el origen actual (ej. https://servite.com) + /m/ + slug + codigo de mesa
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrValue = `${baseUrl}/m/${restaurantSlug}/${table.table_code}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 50, 50, 500, 500);
      const link = document.createElement('a');
      link.download = `Mesa-${table.table_number}-QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Mesa ${table.table_number} - QR</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <h1 style="margin-bottom:8px;">Mesa ${table.table_number}</h1>
          <p style="color:#666;margin-bottom:24px;">${table.table_code}</p>
          ${svgData}
          <p style="margin-top:24px;color:#999;font-size:12px;">Escanea para ver el menú</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1F2933] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1F2933] mb-1">Mesa {table.table_number}</h2>
          <p className="text-sm text-[#6B7280] font-mono mb-6">{table.table_code}</p>

          <div ref={qrRef} className="inline-flex p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm mb-6">
            <QRCodeSVG
              value={qrValue}
              size={250}
              level="H"
              includeMargin
            />
          </div>

          <p className="text-xs text-[#6B7280] mb-6">
            Escanea este código para acceder al menú digital
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-[#E76F51] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#D4604A] transition-colors"
            >
              <Download size={16} />
              Descargar
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 border border-[#E5E7EB] text-[#1F2933] rounded-xl px-4 py-3 font-medium hover:bg-[#F9FAFB] transition-colors"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── New Table Modal ────────────────────────────────────────────── */
function NewTableModal({
  restaurantId,
  branchId,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tableNumber, setTableNumber] = useState('');
  const [type, setType] = useState<'dine_in'|'takeaway'>('dine_in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) { setError('El número de mesa es obligatorio'); return; }

    setSaving(true);
    setError('');

    const tableCode = `MESA-${tableNumber.trim()}`;

    const { error: err } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        table_number: tableNumber.trim(),
        table_code: tableCode,
        is_active: true,
        type,
      });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#1F2933]">Nueva mesa</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2933] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Número de mesa *</label>
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Ej: 1, 2, 3..."
              autoFocus
            />
            {tableNumber && (
              <p className="text-xs text-[#6B7280] mt-1.5">
                Código generado: <span className="font-mono font-medium text-[#1F2933]">MESA-{tableNumber.trim()}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Tipo de Mesa</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'dine_in'|'takeaway')}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
            >
              <option value="dine_in">Mesa Normal (Dine-in)</option>
              <option value="takeaway">Pedidos en Barra / Fila (Takeaway)</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-4 py-3 font-medium hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#E76F51] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#D4604A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Creando...' : (
                <>
                  <Check size={16} />
                  Crear mesa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
