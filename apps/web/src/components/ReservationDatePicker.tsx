"use client";

import { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  isToday as checkIsToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface ReservationDatePickerProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  datesWithReservations?: string[]; // Array of 'YYYY-MM-DD'
}

export function ReservationDatePicker({
  selectedDate,
  onSelectDate,
  datesWithReservations = [],
}: ReservationDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month being viewed in calendar
  const initialDate = selectedDate ? parseISO(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));

  // Update currentMonth if selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(startOfMonth(parseISO(selectedDate)));
    }
  }, [selectedDate]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Days calculations
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = getDay(startOfMonth(currentMonth)); // 0 = Domingo, 1 = Lunes, etc.

  // Set for O(1) reservation check
  const reservationSet = new Set(datesWithReservations);

  const formattedDisplay = (() => {
    if (!selectedDate) return "Seleccionar fecha";
    try {
      const [y, m, d] = selectedDate.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return selectedDate;
    }
  })();

  const handleSelectDay = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    onSelectDate(dateString);
    setIsOpen(false);
  };

  const handleGoToday = () => {
    const today = new Date();
    const dateString = format(today, "yyyy-MM-dd");
    setCurrentMonth(startOfMonth(today));
    onSelectDate(dateString);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Clickable Bubble */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-2 cursor-pointer transition-all shadow-sm select-none min-w-[150px] bg-white ${
          isOpen
            ? "border-[#E76F51] ring-2 ring-[#E76F51]/20 shadow-md"
            : "border-[#E5E7EB] hover:border-[#E76F51]"
        }`}
      >
        <span className="text-[#1F2933] font-medium text-sm">
          {formattedDisplay}
        </span>
        <div className="flex items-center gap-1.5">
          {reservationSet.has(selectedDate) && (
            <span
              className="w-2 h-2 rounded-full bg-[#E76F51]"
              title="Tiene reservas en esta fecha"
            />
          )}
          <CalendarIcon className="w-4 h-4 text-[#6B7280]" />
        </div>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-4 w-[300px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-sm text-[#1F2933] capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((day) => (
              <span
                key={day}
                className="text-[11px] font-semibold text-[#9CA3AF] py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {daysInMonth.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const isSelected = dateStr === selectedDate;
              const hasReservations = reservationSet.has(dateStr);
              const isToday = checkIsToday(date);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleSelectDay(date)}
                  className={`
                    w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all relative
                    ${
                      isSelected
                        ? "bg-[#E76F51] text-white font-bold shadow-sm"
                        : hasReservations
                        ? "bg-[#E76F51]/15 text-[#E76F51] font-bold border border-[#E76F51]/50 hover:bg-[#E76F51]/25"
                        : "text-[#1F2933] hover:bg-gray-100"
                    }
                    ${isToday && !isSelected ? "ring-1 ring-gray-400 font-semibold" : ""}
                  `}
                  title={
                    hasReservations
                      ? `${format(date, "d 'de' MMMM", { locale: es })}: Tiene reservas`
                      : format(date, "d 'de' MMMM", { locale: es })
                  }
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {/* Legend & Action */}
          <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#E76F51]/15 border border-[#E76F51]/50 inline-block" />
              <span>Con reservas</span>
            </div>
            <button
              type="button"
              onClick={handleGoToday}
              className="text-[#E76F51] hover:underline font-semibold"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

