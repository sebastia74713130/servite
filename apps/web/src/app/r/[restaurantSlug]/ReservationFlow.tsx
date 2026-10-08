"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, getDay, addMinutes, parse } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin, Users, CalendarDays, Clock, User, Phone, Mail } from "lucide-react";

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

export default function ReservationFlow({ restaurant, branches }: { restaurant: any; branches: any[] }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const brandColor = restaurant.brandColor || '#E76F51';

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
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches.length === 1 ? branches[0].id : "");
  
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
    if (!selectedDate || !selectedBranchId) {
      setExistingReservations([]);
      return;
    }

    const fetchReservations = async () => {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_time, duration_minutes')
        .eq('branch_id', selectedBranchId)
        .eq('reservation_date', formattedDate)
        .neq('status', 'cancelled');
        
      if (!error && data) {
        setExistingReservations(data);
      }
    };
    
    fetchReservations();
  }, [selectedDate, selectedBranchId]);

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

    if (!selectedBranchId) {
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
        branch_id: selectedBranchId,
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
      const currentEnd = addMinutes(current, 90);

      for (const res of existingReservations) {
        let resStart = parse(res.reservation_time, 'HH:mm:ss', selectedDate);
        if (isNaN(resStart.getTime())) {
          resStart = parse(res.reservation_time, 'HH:mm', selectedDate);
        }
        
        const duration = res.duration_minutes || 90;
        const resEnd = addMinutes(resStart, duration);

        if (current.getTime() < resEnd.getTime() && currentEnd.getTime() > resStart.getTime()) {
          overlaps++;
        }
      }

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
      <div className="bg-[#1A1A1A]/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 animate-in fade-in zoom-in duration-500 shadow-2xl relative overflow-hidden">
        {/* Glow effect in success card */}
        <div 
          className="absolute top-[-50px] left-[50%] -translate-x-1/2 w-full h-[150px] blur-[80px] opacity-20 pointer-events-none"
          style={{ backgroundColor: brandColor }}
        />
        
        <div className="text-center relative z-10">
          <div className="mx-auto w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white">¡Reserva Solicitada!</h2>
          <p className="text-[#A0A0A0] mb-8 text-lg">
            Tu solicitud ha sido enviada a <strong className="text-white">{restaurant.name}</strong>. Te contactaremos pronto para confirmar.
          </p>
          
          {/* Ticket style */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 text-left max-w-sm mx-auto shadow-inner relative">
            {/* Ticket notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1A1A1A] rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1A1A1A] rounded-full" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 text-[#888]"><CalendarDays className="w-4 h-4" /> Fecha</div>
                <div className="text-white font-medium">{selectedDate ? format(selectedDate, "d 'de' MMM, yyyy", { locale: es }) : ''}</div>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 text-[#888]"><Clock className="w-4 h-4" /> Hora</div>
                <div className="text-white font-medium">{selectedTime}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#888]"><Users className="w-4 h-4" /> Personas</div>
                <div className="text-white font-medium">{partySize}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative animate-in fade-in duration-500">
      
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div 
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'opacity-100' : 'bg-white/10'}`} 
          style={{ backgroundColor: step >= 1 ? brandColor : undefined }} 
        />
        <div 
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'bg-white/10'}`} 
          style={{ backgroundColor: step >= 2 ? brandColor : undefined }} 
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-300">
          
          {branches && branches.length > 1 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{color: brandColor}}/> ¿En qué sucursal?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map(branch => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranchId(branch.id)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between ${selectedBranchId === branch.id ? 'text-white' : 'bg-[#111111]/50 border-white/5 text-[#888888] hover:border-white/20 hover:bg-[#111111]'}`}
                    style={selectedBranchId === branch.id ? {
                      backgroundColor: brandColor,
                      borderColor: brandColor,
                      boxShadow: `0 10px 25px -5px ${brandColor}60`
                    } : undefined}
                  >
                    <span className="font-bold">{branch.name}</span>
                    {selectedBranchId === branch.id && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Party Size */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" style={{color: brandColor}}/> ¿Para cuántas personas?
            </h2>
            <div className="flex items-center gap-4 bg-[#111111]/50 p-2 rounded-2xl border border-white/5 w-max shadow-inner">
              <button 
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-2xl font-medium text-white"
              >-</button>
              <div className="w-12 text-center text-xl font-bold text-white">{partySize}</div>
              <button 
                onClick={() => setPartySize(Math.min(20, partySize + 1))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-2xl font-medium text-white"
              >+</button>
            </div>
          </section>

          {/* Date Picker */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" style={{color: brandColor}}/> Selecciona una fecha
            </h2>
            <div className="bg-[#111111]/50 p-6 rounded-3xl border border-white/5 shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-[#888] hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold capitalize text-white">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-[#888] hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center mb-3">
                {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => (
                  <div key={d} className="text-xs font-bold text-[#666] uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-2 gap-x-2 text-center">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {daysInMonth.map((date, i) => {
                  const selectable = isDateSelectable(date);
                  const selected = selectedDate && isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <button
                      key={i}
                      disabled={!selectable}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null); // reset time
                      }}
                      className={`
                        h-10 w-full rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                        ${selected ? 'text-white font-bold' : ''}
                        ${!selected && selectable ? 'text-white hover:bg-white/10' : ''}
                        ${!selectable ? 'text-[#444] cursor-not-allowed opacity-50' : ''}
                        ${isToday && !selected ? 'border border-white/20' : ''}
                      `}
                      style={selected ? {
                        backgroundColor: brandColor,
                        boxShadow: `0 4px 15px ${brandColor}60`
                      } : undefined}
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
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" style={{color: brandColor}}/> Elige una hora
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {timeSlots.map(time => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`
                        py-3 rounded-xl text-sm font-bold transition-all duration-200 border
                        ${isSelected 
                          ? 'text-white' 
                          : 'bg-[#111111]/50 text-white border-white/5 hover:border-white/20 hover:bg-[#111111]'
                        }
                      `}
                      style={isSelected ? {
                        backgroundColor: brandColor,
                        borderColor: brandColor,
                        boxShadow: `0 4px 15px ${brandColor}60`
                      } : undefined}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              {timeSlots.length === 0 && (
                <div className="text-[#888] text-sm bg-white/5 p-4 rounded-xl text-center">No hay horarios disponibles para esta fecha.</div>
              )}
            </section>
          )}

          <div className="pt-6">
            <button
              onClick={handleNextStep}
              className="w-full font-bold text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 text-white"
              style={{ backgroundColor: brandColor }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="mb-8 flex items-center gap-4">
            <button type="button" onClick={() => setStep(1)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-2xl font-bold text-white">Tus datos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888]">Nombre *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#666]" />
                </div>
                <input 
                  required
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({...form, firstName: e.target.value})}
                  className="w-full bg-[#111111]/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-all"
                  style={{ '--tw-ring-color': brandColor, '--tw-ring-shadow': `var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)` } as any}
                  onFocus={(e) => e.target.style.borderColor = brandColor}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#888]">Apellido *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#666]" />
                </div>
                <input 
                  required
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({...form, lastName: e.target.value})}
                  className="w-full bg-[#111111]/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-all"
                  onFocus={(e) => e.target.style.borderColor = brandColor}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-medium text-[#888]">Celular *</label>
              <span className="text-xs text-[#666]">Mínimo 8 dígitos</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-[#666]" />
              </div>
              <input 
                required
                type="tel"
                placeholder="Ej: 71234567"
                value={form.phone}
                onChange={e => {
                  setForm({...form, phone: e.target.value});
                  if (phoneError) setPhoneError("");
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = phoneError ? 'rgb(239, 68, 68)' : 'rgba(255,255,255,0.1)';
                  if (form.phone.trim()) {
                    const check = validatePhoneNumber(form.phone);
                    if (!check.isValid) setPhoneError(check.error || "");
                  }
                }}
                onFocus={(e) => e.target.style.borderColor = phoneError ? 'rgb(239, 68, 68)' : brandColor}
                className={`w-full bg-[#111111]/80 border rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-all ${
                  phoneError ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-red-400 mt-1 animate-in fade-in">{phoneError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Correo Electrónico (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-[#666]" />
              </div>
              <input 
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-[#111111]/80 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-all"
                onFocus={(e) => e.target.style.borderColor = brandColor}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold text-lg py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
              style={{ backgroundColor: brandColor, boxShadow: `0 4px 20px ${brandColor}40` }}
            >
              {loading ? "Confirmando..." : "Confirmar Reserva"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
