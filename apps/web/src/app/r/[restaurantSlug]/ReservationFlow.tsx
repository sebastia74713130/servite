"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay, addMinutes, parse } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: "El número de celular es obligatorio." };
  }

  // Allow only digits, +, -, (, ), and spaces
  if (!/^[\d\s+\-()]+$/.test(trimmed)) {
    return { isValid: false, error: "El teléfono solo puede contener números, espacios y los símbolos +, -, ()." };
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 8) {
    return { 
      isValid: false, 
      error: `El número debe tener al menos 8 dígitos (ingresaste ${digits.length}).` 
    };
  }

  if (digits.length > 15) {
    return { 
      isValid: false, 
      error: `El número excede el límite permitido de 15 dígitos (ingresaste ${digits.length}).` 
    };
  }

  // Prevent obvious dummy patterns like 00000000, 11111111
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, error: "Por favor ingresa un número de teléfono válido." };
  }

  // If starts with Bolivian country code 591
  if (digits.startsWith("591") && digits.length !== 11) {
    return { 
      isValid: false, 
      error: `Con código de país +591, debe tener 8 dígitos adicionales (actualmente tiene ${digits.length - 3}).` 
    };
  }

  return { isValid: true };
}

export default function ReservationFlow({ restaurant, branchId }: { restaurant: any; branchId: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Settings
  const settings = restaurant.reservation_settings || {
    open_time: '12:00',
    close_time: '22:00',
    interval_minutes: 30,
    days_available: [0, 1, 2, 3, 4, 5, 6]
  };

  // Step 1 State
  const [partySize, setPartySize] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  // Step 2 State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  const [existingReservations, setExistingReservations] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedDate || !branchId) {
      setExistingReservations([]);
      return;
    }

    const fetchReservations = async () => {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_time, duration_minutes')
        .eq('branch_id', branchId)
        .eq('reservation_date', formattedDate)
        .neq('status', 'cancelled');
        
      if (!error && data) {
        setExistingReservations(data);
      }
    };
    
    fetchReservations();
  }, [selectedDate, branchId]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedDate || !selectedTime) {
        setError("Por favor selecciona una fecha y hora");
        return;
      }
      setError("");
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneError("");

    if (!branchId) {
      setError("Este restaurante no tiene sucursales activas para reservar.");
      return;
    }

    const phoneValidation = validatePhoneNumber(form.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || "Número de celular no válido.");
      setError(phoneValidation.error || "Por favor verifica el número de celular.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('reservations').insert({
        restaurant_id: restaurant.id,
        branch_id: branchId,
        customer_name: `${form.firstName} ${form.lastName}`.trim(),
        customer_phone: form.phone,
        customer_email: form.email || null,
        party_size: partySize,
        reservation_date: format(selectedDate!, 'yyyy-MM-dd'),
        reservation_time: selectedTime,
        status: 'pending',
        duration_minutes: 90 // standard 1.5 hours
      });

      if (insertError) throw insertError;
      
      setStep(3); // Success
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al procesar tu reserva.");
    } finally {
      setLoading(false);
    }
  };

  // Calendar Logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  // Padding for grid
  const startDay = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: startDay === 0 ? 6 : startDay - 1 }); // Adjust for Monday start if needed, but let's stick to simple Sunday=0 indexing
  
  const isDateSelectable = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return false;
    if (!settings.days_available.includes(getDay(date))) return false;
    return true;
  };

  // Time Slots Logic
  const generateTimeSlots = () => {
    if (!selectedDate) return [];
    
    const slots = [];
    let current = parse(settings.open_time, 'HH:mm:ss', selectedDate);
    if (isNaN(current.getTime())) {
      current = parse(settings.open_time, 'HH:mm', selectedDate);
    }
    
    let end = parse(settings.close_time, 'HH:mm:ss', selectedDate);
    if (isNaN(end.getTime())) {
      end = parse(settings.close_time, 'HH:mm', selectedDate);
    }

    const availableTables = settings.available_tables || 5;

    while (isBefore(current, end) || current.getTime() === end.getTime()) {
      let overlaps = 0;
      const currentEnd = addMinutes(current, 90); // Each reservation blocks table for 90 mins

      for (const res of existingReservations) {
        let resStart = parse(res.reservation_time, 'HH:mm:ss', selectedDate);
        if (isNaN(resStart.getTime())) {
          resStart = parse(res.reservation_time, 'HH:mm', selectedDate);
        }
        
        const duration = res.duration_minutes || 90;
        const resEnd = addMinutes(resStart, duration);

        // Check if there is an overlap in time
        if (current.getTime() < resEnd.getTime() && currentEnd.getTime() > resStart.getTime()) {
          overlaps++;
        }
      }

      // Only add slot if we haven't reached table capacity
      if (overlaps < availableTables) {
        slots.push(format(current, 'HH:mm'));
      }
      
      current = addMinutes(current, settings.interval_minutes);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (step === 3) {
    return (
      <div className="text-center bg-[#1A1A1A] p-10 rounded-3xl border border-[#2A2A2A] animate-in fade-in zoom-in duration-300">
        <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">¡Reserva Solicitada!</h2>
        <p className="text-[#888888] mb-6">
          Tu solicitud ha sido enviada a {restaurant.name}. Te contactaremos pronto para confirmar.
        </p>
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 text-left max-w-sm mx-auto">
          <div className="mb-2"><span className="text-[#666]">Fecha:</span> <span className="text-white float-right">{selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : ''}</span></div>
          <div className="mb-2"><span className="text-[#666]">Hora:</span> <span className="text-white float-right">{selectedTime}</span></div>
          <div className="mb-0"><span className="text-[#666]">Personas:</span> <span className="text-white float-right">{partySize}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-10">
          
          {/* Party Size */}
          <section>
            <h2 className="text-xl font-bold mb-4">¿Para cuántas personas?</h2>
            <div className="flex items-center gap-4 bg-[#1A1A1A] p-2 rounded-2xl border border-[#2A2A2A] w-max">
              <button 
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors text-xl font-bold"
              >-</button>
              <div className="w-12 text-center text-xl font-bold">{partySize}</div>
              <button 
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors text-xl font-bold"
              >+</button>
            </div>
          </section>

          {/* Date Picker */}
          <section>
            <h2 className="text-xl font-bold mb-4">Selecciona una fecha</h2>
            <div className="bg-[#1A1A1A] p-6 rounded-3xl border border-[#2A2A2A]">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-[#888] hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-[#888] hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center mb-2">
                {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => (
                  <div key={d} className="text-xs font-medium text-[#666] uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-2 gap-x-2 text-center">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {daysInMonth.map((date, i) => {
                  const selectable = isDateSelectable(date);
                  const selected = selectedDate && isSameDay(date, selectedDate);
                  
                  return (
                    <button
                      key={i}
                      disabled={!selectable}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null); // reset time
                      }}
                      className={`
                        h-10 w-full rounded-full flex items-center justify-center text-sm font-medium transition-all
                        ${selected ? 'bg-[#E76F51] text-white shadow-[0_0_15px_rgba(231,111,81,0.4)]' : ''}
                        ${!selected && selectable ? 'text-white hover:bg-[#333]' : ''}
                        ${!selectable ? 'text-[#444] cursor-not-allowed opacity-50' : ''}
                      `}
                    >
                      {format(date, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Time Picker */}
          {selectedDate && (
            <section className="animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold mb-4">Elige una hora</h2>
              <div className="flex flex-wrap gap-3">
                {timeSlots.map(time => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`
                        px-6 py-3 rounded-full text-sm font-medium transition-all border
                        ${isSelected 
                          ? 'bg-white text-black border-white' 
                          : 'bg-transparent text-white border-[#333] hover:border-[#666]'
                        }
                      `}
                    >
                      {time}
                    </button>
                  );
                })}
                {timeSlots.length === 0 && (
                  <div className="text-[#888] text-sm">No hay horarios disponibles para esta fecha.</div>
                )}
              </div>
            </section>
          )}

          <div className="pt-6">
            <button
              onClick={handleNextStep}
              className="w-full bg-white text-black font-bold text-lg py-4 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="mb-8 flex items-center gap-4">
            <button type="button" onClick={() => setStep(1)} className="p-2 bg-[#2A2A2A] rounded-full hover:bg-[#333] transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-xl font-bold">Tus datos</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888]">Nombre *</label>
              <input 
                required
                type="text"
                value={form.firstName}
                onChange={e => setForm({...form, firstName: e.target.value})}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E76F51] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888]">Apellido *</label>
              <input 
                required
                type="text"
                value={form.lastName}
                onChange={e => setForm({...form, lastName: e.target.value})}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E76F51] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-[#888]">Celular *</label>
              <span className="text-xs text-[#666]">Mínimo 8 dígitos</span>
            </div>
            <input 
              required
              type="tel"
              placeholder="Ej: 71234567 o +591 71234567"
              value={form.phone}
              onChange={e => {
                setForm({...form, phone: e.target.value});
                if (phoneError) setPhoneError("");
              }}
              onBlur={() => {
                if (form.phone.trim()) {
                  const check = validatePhoneNumber(form.phone);
                  if (!check.isValid) setPhoneError(check.error || "");
                }
              }}
              className={`w-full bg-[#1A1A1A] border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${
                phoneError ? 'border-red-500/80 focus:border-red-500' : 'border-[#2A2A2A] focus:border-[#E76F51]'
              }`}
            />
            {phoneError && (
              <p className="text-xs text-red-400 mt-1">{phoneError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Correo Electrónico (Opcional)</label>
            <input 
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E76F51] transition-colors"
            />
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E76F51] text-white font-bold text-lg py-4 rounded-2xl hover:bg-[#D4604A] transition-colors disabled:opacity-50"
            >
              {loading ? "Confirmando..." : "Confirmar Reserva"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

