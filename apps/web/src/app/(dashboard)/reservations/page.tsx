'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { useReservations, Reservation } from "@/hooks/useReservations";
import { useTables } from "@/hooks/useTables";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/lib/supabase";
import {
  CalendarPlus,
  CalendarClock,
  Calendar as CalendarIcon,
  Phone,
  Clock,
  Users,
  LayoutGrid,
  Mail,
  X,
  FileText,
  Share2,
  Settings
} from "lucide-react";
import { ReservationSettingsModal } from "@/components/ReservationSettingsModal";
import { ReservationDatePicker } from "@/components/ReservationDatePicker";

// --- Components ---

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmada' },
    seated: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En mesa' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completada' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
    no_show: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'No se presentó' }
  };

  const current = config[status] || config.pending;

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${current.bg} ${current.text}`}>
      {current.label}
    </span>
  );
}

function ReservationCard({
  reservation,
  onStatusChange,
  onViewDetail
}: {
  reservation: Reservation;
  onStatusChange: (id: string, status: Reservation['status']) => void;
  onViewDetail: (r: Reservation) => void;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-[#1F2933]">{reservation.customer_name}</h3>
            <div className="flex items-center text-sm text-[#6B7280] mt-1 gap-1">
              <Phone className="w-4 h-4" />
              <span>{reservation.customer_phone}</span>
            </div>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="grid grid-cols-2 gap-y-3 mt-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#E76F51]" />
            <span className="text-xl font-bold text-[#E76F51]">
              {reservation.reservation_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#1F2933]">
            <Users className="w-5 h-5 text-[#6B7280]" />
            <span className="font-medium">{reservation.party_size} pers.</span>
          </div>
          {reservation.table && (
            <div className="flex items-center gap-2 text-[#1F2933] col-span-2">
              <LayoutGrid className="w-5 h-5 text-[#6B7280]" />
              <span className="font-medium">Mesa: {reservation.table.table_code || reservation.table.table_number}</span>
            </div>
          )}
          {reservation.notes && (
            <div className="col-span-2 text-sm text-[#6B7280] line-clamp-2 mt-1 italic">
              "{reservation.notes}"
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <>
              <button
                onClick={() => onStatusChange(reservation.id, 'confirmed')}
                className="px-3 py-1.5 text-sm font-medium border border-green-600 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => onStatusChange(reservation.id, 'cancelled')}
                className="px-3 py-1.5 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Rechazar
              </button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <>
              <button
                onClick={() => onStatusChange(reservation.id, 'seated')}
                className="px-3 py-1.5 text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              >
                Sentar
              </button>
              <button
                onClick={() => onStatusChange(reservation.id, 'cancelled')}
                className="px-3 py-1.5 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
          {reservation.status === 'seated' && (
            <button
              onClick={() => onStatusChange(reservation.id, 'completed')}
              className="px-3 py-1.5 text-sm font-medium border border-green-600 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
            >
              Completar
            </button>
          )}
        </div>
        
        <button
          onClick={() => onViewDetail(reservation)}
          className="px-3 py-1.5 text-sm font-medium border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl transition-colors ml-auto"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
}

function NewReservationModal({
  restaurantId,
  branchId,
  tables,
  onClose,
  onSaved
}: {
  restaurantId: string;
  branchId: string;
  tables: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '12:00',
    party_size: 2,
    table_id: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phoneTrimmed = formData.customer_phone.trim();
    const digits = phoneTrimmed.replace(/\D/g, '');
    if (!/^[\d\s+\-()]+$/.test(phoneTrimmed) || digits.length < 8) {
      setError(`Por favor ingresa un número de teléfono válido con al menos 8 dígitos (ingresaste ${digits.length}).`);
      return;
    }
    if (digits.length > 15) {
      setError(`El número de teléfono excede el límite permitido de 15 dígitos (ingresaste ${digits.length}).`);
      return;
    }

    setLoading(true);
    
    try {
      const { error: insertError } = await supabase.from('reservations').insert({
        restaurant_id: restaurantId,
        branch_id: branchId,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        party_size: formData.party_size,
        table_id: formData.table_id || null,
        notes: formData.notes || null,
        duration_minutes: 120, // default
        status: 'pending'
      });

      if (insertError) throw insertError;
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#1F2933]">Nueva reserva</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre del cliente *</label>
            <input
              required
              type="text"
              value={formData.customer_name}
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Teléfono *</label>
              <input
                required
                type="text"
                placeholder="+591 7XXXXXXX"
                value={formData.customer_phone}
                onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Email</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Fecha *</label>
              <input
                required
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.reservation_date}
                onChange={e => setFormData({ ...formData, reservation_date: e.target.value })}
                onClick={e => e.currentTarget.showPicker?.()}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Hora *</label>
              <input
                required
                type="time"
                value={formData.reservation_time}
                onChange={e => setFormData({ ...formData, reservation_time: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Personas *</label>
              <input
                required
                type="number"
                min="1"
                max="20"
                value={formData.party_size}
                onChange={e => setFormData({ ...formData, party_size: parseInt(e.target.value) })}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Mesa</label>
              <select
                value={formData.table_id}
                onChange={e => setFormData({ ...formData, table_id: e.target.value })}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
              >
                <option value="">Sin asignar</option>
                {tables?.filter((t: any) => t.type !== 'takeaway' && t.is_active).map((t: any) => (
                  <option key={t.id} value={t.id}>
                    Mesa {t.table_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Notas</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl px-4 py-2.5 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#E76F51] text-white hover:bg-[#D4604A] rounded-xl font-medium px-6 py-2.5 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReservationDetailModal({
  reservation,
  tables,
  onClose,
  onUpdated
}: {
  reservation: Reservation;
  tables: any[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    status: reservation.status,
    table_id: reservation.table_id || '',
    notes: reservation.notes || ''
  });

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: formData.status,
          table_id: formData.table_id || null,
          notes: formData.notes || null,
        })
        .eq('id', reservation.id);
        
      if (updateError) throw updateError;
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#1F2933]">Detalles de reserva</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-sm font-medium text-[#6B7280] mb-2 uppercase tracking-wider">Cliente</h3>
            <div className="bg-[#F9FAFB] rounded-xl p-4 space-y-2">
              <p className="font-bold text-lg text-[#1F2933]">{reservation.customer_name}</p>
              <div className="flex items-center text-sm text-[#1F2933] gap-2">
                <Phone className="w-4 h-4 text-[#6B7280]" />
                {reservation.customer_phone}
              </div>
              {reservation.customer_email && (
                <div className="flex items-center text-sm text-[#1F2933] gap-2">
                  <Mail className="w-4 h-4 text-[#6B7280]" />
                  {reservation.customer_email}
                </div>
              )}
            </div>
          </div>

          {/* Reservation Info */}
          <div>
            <h3 className="text-sm font-medium text-[#6B7280] mb-2 uppercase tracking-wider">Reserva</h3>
            <div className="bg-[#F9FAFB] rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#6B7280] block mb-1">Fecha y Hora</span>
                <div className="font-medium text-[#1F2933]">
                  {reservation.reservation_date} <br/>
                  <span className="text-[#E76F51] font-bold">{reservation.reservation_time.slice(0, 5)}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block mb-1">Personas</span>
                <div className="font-medium text-[#1F2933]">{reservation.party_size}</div>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block mb-1">Duración</span>
                <div className="font-medium text-[#1F2933]">{reservation.duration_minutes} min</div>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block mb-1">Estado actual</span>
                <StatusBadge status={reservation.status} />
              </div>
            </div>
          </div>

          {/* Edit form section */}
          <div className="space-y-4 pt-2 border-t border-[#E5E7EB]">
            <h3 className="text-sm font-medium text-[#1F2933]">Actualizar</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Estado</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as Reservation['status'] })}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="seated">En mesa</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="no_show">No se presentó</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Mesa asignada</label>
                <select
                  value={formData.table_id}
                  onChange={e => setFormData({ ...formData, table_id: e.target.value })}
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
                >
                  <option value="">Sin asignar</option>
                  {tables?.filter((t: any) => t.type !== 'takeaway' && t.is_active).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      Mesa {t.table_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Notas</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl px-4 py-2.5 font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#E76F51] text-white hover:bg-[#D4604A] rounded-xl font-medium px-6 py-2.5 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function ReservationsPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [datesWithReservations, setDatesWithReservations] = useState<string[]>([]);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [detailModalRes, setDetailModalRes] = useState<Reservation | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const fetchDatesWithReservations = useCallback(async () => {
    if (!restaurant?.id) return;
    try {
      const { data } = await supabase
        .from('reservations')
        .select('reservation_date')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');
      if (data) {
        const unique = Array.from(new Set(data.map((r: any) => r.reservation_date)));
        setDatesWithReservations(unique as string[]);
      }
    } catch (e) {
      console.error('Error fetching reservation dates:', e);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchDatesWithReservations();
  }, [fetchDatesWithReservations]);

  const handleShareLink = () => {
    if (!restaurant?.slug) return;
    
    let rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    let protocol = 'https:';
    if (!rootDomain && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      rootDomain = hostname === 'localhost' ? window.location.host : hostname.split('.').slice(-2).join('.');
      protocol = window.location.protocol;
    }
    
    const url = rootDomain 
      ? `${protocol}//${restaurant.slug}.${rootDomain}/reservas` 
      : `${window.location.origin}/r/${restaurant.slug}`;
      
    navigator.clipboard.writeText(url);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 3000);
  };

  const { reservations, loading: reservationsLoading, refetch } = useReservations(restaurant?.id, selectedDate);
  const { tables } = useTables(restaurant?.id, branch?.id);

  if (sessionLoading || reservationsLoading) {
    return <LoadingState />;
  }

  const handleStatusChange = async (id: string, status: Reservation['status']) => {
    try {
      await supabase.from('reservations').update({ status }).eq('id', id);
      refetch();
      fetchDatesWithReservations();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const statusTabs = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Sentados', value: 'seated' },
    { label: 'Completadas', value: 'completed' },
    { label: 'Canceladas', value: 'cancelled' }
  ];

  const filteredReservations = reservations.filter(r => {
    if (statusFilter === 'Todas') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">

        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2933]">Reservas</h1>
            <p className="text-sm text-[#6B7280]">
              {filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'} para esta fecha
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShareLink}
              className="bg-white border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl font-medium px-4 py-2.5 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Compartir
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-white border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl font-medium px-4 py-2.5 transition-colors flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Configurar
            </button>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="bg-[#E76F51] text-white hover:bg-[#D4604A] rounded-xl font-medium px-4 py-2.5 transition-colors flex items-center gap-2"
            >
              <CalendarPlus className="w-5 h-5" />
              Nueva reserva
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#1F2933]">Fecha:</label>
            <ReservationDatePicker
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              datesWithReservations={datesWithReservations}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-[#FDF0EC] text-[#E76F51] border border-[#E76F51]'
                    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {filteredReservations.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No hay reservas"
            subtitle="Las reservas para esta fecha aparecerán aquí."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReservations.map(reservation => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onStatusChange={handleStatusChange}
                onViewDetail={setDetailModalRes}
              />
            ))}
          </div>
        )}



      {/* Modals */}
      {isNewModalOpen && restaurant?.id && branch?.id && (
        <NewReservationModal
          restaurantId={restaurant.id}
          branchId={branch.id}
          tables={tables}
          onClose={() => setIsNewModalOpen(false)}
          onSaved={() => {
            setIsNewModalOpen(false);
            refetch();
            fetchDatesWithReservations();
          }}
        />
      )}

      {detailModalRes && (
        <ReservationDetailModal
          reservation={detailModalRes}
          tables={tables}
          onClose={() => setDetailModalRes(null)}
          onUpdated={() => {
            setDetailModalRes(null);
            refetch();
            fetchDatesWithReservations();
          }}
        />
      )}
      
      {isSettingsModalOpen && restaurant && (
        <ReservationSettingsModal
          restaurant={restaurant}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaved={() => {
            setIsSettingsModalOpen(false);
            window.location.reload();
          }}
        />
      )}
      
      {/* Toast Notification */}
      {showCopiedToast && (
        <div className="fixed bottom-6 right-6 bg-[#1F2933] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-medium">Enlace de reservas copiado al portapapeles</span>
        </div>
      )}
    </div>
  );
}
