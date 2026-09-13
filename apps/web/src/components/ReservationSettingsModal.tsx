import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

export function ReservationSettingsModal({
  restaurant,
  onClose,
  onSaved
}: {
  restaurant: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const defaultSettings = restaurant.reservation_settings || {
    open_time: '12:00',
    close_time: '22:00',
    interval_minutes: 30,
    days_available: [0, 1, 2, 3, 4, 5, 6]
  };

  const [settings, setSettings] = useState(defaultSettings);

  const days = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
  ];

  const handleToggleDay = (dayId: number) => {
    const current = settings.days_available || [];
    if (current.includes(dayId)) {
      setSettings({ ...settings, days_available: current.filter((d: number) => d !== dayId) });
    } else {
      setSettings({ ...settings, days_available: [...current, dayId] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ reservation_settings: settings })
      .eq('id', restaurant.id);
      
    if (updateError) {
      setError(updateError.message);
    } else {
      onSaved();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1F2933]">Configurar Reservas</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Hora Inicio</label>
              <input type="time" value={settings.open_time} onChange={e => setSettings({...settings, open_time: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Hora Fin</label>
              <input type="time" value={settings.close_time} onChange={e => setSettings({...settings, close_time: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Intervalo (minutos)</label>
            <select value={settings.interval_minutes} onChange={e => setSettings({...settings, interval_minutes: parseInt(e.target.value)})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5 bg-white">
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>60 minutos (1 hora)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-2 block">Días Disponibles</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleToggleDay(day.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    settings.days_available?.includes(day.id) 
                      ? 'bg-[#E76F51] text-white border-[#E76F51]' 
                      : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  {day.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="border border-[#E5E7EB] text-[#1F2933] hover:bg-[#F9FAFB] rounded-xl px-4 py-2 font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-[#E76F51] text-white hover:bg-[#D4604A] rounded-xl font-medium px-5 py-2 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

