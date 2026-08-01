'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import {
  Save,
  CheckCircle,
  Store,
  Phone,
  MapPin,
  FileText,
  Building2,
  Monitor,
  Plus,
  Trash2,
  Upload,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { useKitchenStations } from '@/hooks/useKitchenStations';
import { compressImage } from '@/lib/imageUtils';
import { ImageCropperModal } from '@/components/ImageCropperModal';

export default function SettingsPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Branding
  const [brandColor, setBrandColor] = useState('#F9FAFB');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  
  // Cropper states
  const [rawCoverSrc, setRawCoverSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Kitchen Stations state
  const { stations, refetch: refetchStations } = useKitchenStations(restaurant?.id);
  const [newStationName, setNewStationName] = useState('');
  const [addingStation, setAddingStation] = useState(false);

  // populate form when restaurant loads
  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setDescription(restaurant.description || '');
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setCity(restaurant.city || '');
      setIsActive(restaurant.is_active ?? true);
      setBrandColor(restaurant.brand_color || '#F9FAFB');
      setLogoPreview(restaurant.logo_url || '');
      setCoverPreview(restaurant.cover_url || '');
    }
  }, [restaurant]);

  if (sessionLoading) return <LoadingState />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);

    let finalLogoUrl = restaurant.logo_url || null;

    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${restaurant.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('branding').upload(filePath, logoFile);
      
      if (uploadError) {
        alert('Error al subir el logo: ' + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(filePath);
      finalLogoUrl = publicUrlData.publicUrl;
    }

    let finalCoverUrl = restaurant.cover_url || null;

    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop();
      const fileName = `cover_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${restaurant.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('branding').upload(filePath, coverFile);
      
      if (uploadError) {
        alert('Error al subir la portada: ' + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(filePath);
      finalCoverUrl = publicUrlData.publicUrl;
    }

    await supabase
      .from('restaurants')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        is_active: isActive,
        brand_color: brandColor,
        logo_url: finalLogoUrl,
        cover_url: finalCoverUrl,
      })
      .eq('id', restaurant.id);

    setSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !newStationName.trim()) return;

    setAddingStation(true);
    await supabase.from('kitchen_stations').insert({
      restaurant_id: restaurant.id,
      name: newStationName.trim(),
    });
    setNewStationName('');
    await refetchStations();
    setAddingStation(false);
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta estación de cocina?')) return;
    
    // Instead of deleting, we can mark as inactive to preserve history, or delete.
    // For MVP, we will just delete it to keep it clean.
    await supabase.from('kitchen_stations').delete().eq('id', stationId);
    await refetchStations();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2933]">Configuración</h1>
        <p className="text-[#6B7280] text-sm mt-1">Administra la información de tu restaurante</p>
      </div>

      {/* success banner */}
      {showSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 animate-in fade-in">
          <CheckCircle size={20} />
          <span className="font-medium">Cambios guardados correctamente</span>
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && rawCoverSrc && (
        <ImageCropperModal
          imageSrc={rawCoverSrc}
          aspect={3} // 3:1 aspect ratio for cover banner
          onCancel={() => {
            setShowCropper(false);
            setRawCoverSrc(null);
          }}
          onCropComplete={async (croppedBlob) => {
            const file = new File([croppedBlob], 'cover_cropped.jpg', { type: 'image/jpeg' });
            const compressed = await compressImage(file, 1200, 0.8);
            setCoverFile(compressed);
            setCoverPreview(URL.createObjectURL(compressed));
            setShowCropper(false);
            setRawCoverSrc(null);
          }}
        />
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2 mb-4">
            <Palette size={20} className="text-[#E76F51]" />
            Identidad Visual
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo */}
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <ImageIcon size={14} className="text-[#6B7280]" />
                Logo del Restaurante
              </label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-[#D1D5DB]" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file, 400, 0.8);
                        setLogoFile(compressed);
                        setLogoPreview(URL.createObjectURL(compressed));
                      }
                    }}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <Upload size={16} />
                    Subir logo
                  </label>
                  <p className="text-xs text-[#6B7280] mt-1.5">PNG o WEBP (fondo transparente). Máx 1MB.</p>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <ImageIcon size={14} className="text-[#6B7280]" />
                Foto de Portada
              </label>
              <div className="flex flex-col gap-3 mt-2">
                <div className="w-full h-32 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-[#D1D5DB]" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setRawCoverSrc(reader.result as string);
                          setShowCropper(true);
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = ''; // reset input
                    }}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
                  >
                    <Upload size={16} />
                    Subir portada
                  </label>
                  <p className="text-xs text-[#6B7280] mt-1.5">JPG o WEBP. Formato horizontal recomendado. Máx 1MB.</p>
                </div>
              </div>
            </div>

            {/* Brand Color */}
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <Palette size={14} className="text-[#6B7280]" />
                Color Principal (Menú Móvil)
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                  style={{ backgroundColor: brandColor }}
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-32 border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 uppercase font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2 mb-4">
            <Store size={20} className="text-[#E76F51]" />
            Información General
          </h2>
          {/* restaurant name */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Store size={14} className="text-[#6B7280]" />
              Nombre del restaurante
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Nombre de tu restaurante"
            />
          </div>

          {/* description */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <FileText size={14} className="text-[#6B7280]" />
              Descripción
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors resize-none"
              placeholder="Describe tu restaurante..."
            />
          </div>

          {/* phone + city row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <Phone size={14} className="text-[#6B7280]" />
                Teléfono
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="+57 300 123 4567"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <Building2 size={14} className="text-[#6B7280]" />
                Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="Bogotá, Medellín..."
              />
            </div>
          </div>

          {/* address */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <MapPin size={14} className="text-[#6B7280]" />
              Dirección
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Calle, carrera, número..."
            />
          </div>

          {/* ─── open / closed toggle ─────────────────────────────── */}
          <div className="border-t border-[#E5E7EB] pt-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1F2933]">Estado del restaurante</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Controla si los clientes pueden realizar pedidos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-14 h-7 rounded-full transition-colors relative flex-shrink-0 ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                  isActive ? 'translate-x-7' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="mt-3">
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 rounded-full px-4 py-1.5 text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Abierto — Recibiendo pedidos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 rounded-full px-4 py-1.5 text-sm font-medium">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Cerrado — No se reciben pedidos
                </span>
              )}
            </div>
          </div>
        </div>

        {/* save button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#E76F51] text-white rounded-xl px-6 py-3 font-medium hover:bg-[#D4604A] transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Kitchen Stations Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6 mt-8">
        <div>
          <h2 className="text-xl font-bold text-[#1F2933] flex items-center gap-2">
            <Monitor className="text-[#E76F51]" />
            Pantallas de Cocina
          </h2>
          <p className="text-[#6B7280] text-sm mt-1">
            Configura las diferentes áreas de preparación (ej. Barra, Cocina Caliente, Horno). 
            Los productos podrán asignarse a estas estaciones para dividir los pedidos.
          </p>
        </div>

        <form onSubmit={handleAddStation} className="flex items-end gap-4 mt-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
              Nueva estación
            </label>
            <input
              type="text"
              value={newStationName}
              onChange={e => setNewStationName(e.target.value)}
              placeholder="Ej: Barra de Bebidas"
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={addingStation || !newStationName.trim()}
            className="flex-shrink-0 flex items-center justify-center gap-2 bg-white border border-[#E76F51] text-[#E76F51] rounded-xl px-6 py-3 font-medium hover:bg-[#FDF0EC] transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Añadir
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {stations.length === 0 ? (
            <div className="text-center py-6 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E5E7EB]">
              <p className="text-[#6B7280]">No hay estaciones configuradas.</p>
              <p className="text-sm text-[#6B7280]">Todos los pedidos irán a una única pantalla.</p>
            </div>
          ) : (
            stations.map(station => (
              <div key={station.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-xl px-4 py-3">
                <span className="font-medium text-[#1F2933]">{station.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteStation(station.id)}
                  className="p-2 text-[#6B7280] hover:text-[#D64545] hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
