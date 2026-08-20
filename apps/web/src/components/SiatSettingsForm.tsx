'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Save, 
  Upload, 
  Lock, 
  Building, 
  Hash, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

interface SiatSettingsFormProps {
  restaurantId: string;
}

export function SiatSettingsForm({ restaurantId }: SiatSettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCuis, setSyncingCuis] = useState(false);
  const [syncingCufd, setSyncingCufd] = useState(false);
  const [syncingCatalogos, setSyncingCatalogos] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Configuración SIAT guardada correctamente');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [nit, setNit] = useState('');
  const [sucursal, setSucursal] = useState('0');
  const [puntoVenta, setPuntoVenta] = useState('0');
  const [certPassword, setCertPassword] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  // Status state
  const [cuis, setCuis] = useState<string | null>(null);
  const [cufd, setCufd] = useState<string | null>(null);
  const [cufdFecha, setCufdFecha] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);
  const [producto, setProducto] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!restaurantId) return;
      try {
        const { data, error } = await supabase
          .from('restaurant_siat_settings')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is not found, which is fine
          console.error("Error loading SIAT settings:", error);
          return;
        }

        if (data) {
          setNit(data.siat_nit || '');
          setSucursal(data.siat_codigo_sucursal?.toString() || '0');
          setPuntoVenta(data.siat_codigo_punto_venta?.toString() || '0');
          setCertPassword(data.siat_cert_password || '');
          setCuis(data.siat_cuis);
          setCufd(data.siat_cufd);
          setCufdFecha(data.cufd_fecha_vigencia);
          setActividad(data.siat_actividad_economica);
          setProducto(data.siat_codigo_producto_sin?.toString());
        }
      } catch (err) {
        console.error("Exception loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [restaurantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setSaving(true);
    setError(null);
    setShowSuccess(false);

    try {
      // 1. Upload .p12 if provided
      if (certFile) {
        const filePath = `${restaurantId}/cert.p12`;
        
        const { error: uploadError } = await supabase.storage
          .from('siat_certificates')
          .upload(filePath, certFile, { upsert: true });

        if (uploadError) {
          throw new Error('Error al subir el certificado: ' + uploadError.message);
        }
      }

      // 2. Save Settings in DB
      const { error: dbError } = await supabase
        .from('restaurant_siat_settings')
        .upsert({
          restaurant_id: restaurantId,
          siat_nit: nit,
          siat_codigo_sucursal: parseInt(sucursal) || 0,
          siat_codigo_punto_venta: parseInt(puntoVenta) || 0,
          siat_cert_password: certPassword,
          // CUIS and CUFD are preserved, they are fetched separately
        }, { onConflict: 'restaurant_id' });

      if (dbError) throw dbError;

      setSuccessMessage('Configuración SIAT guardada correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setCertFile(null); // Reset file input
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error guardando configuración SIAT');
    } finally {
      setSaving(false);
    }
  };

  const handleObtenerCuis = async () => {
    if (!restaurantId) return;
    setSyncingCuis(true);
    setError(null);
    try {
      const res = await fetch('/api/siat/cuis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error obteniendo CUIS');
      
      setCuis(data.cuis);
      setSuccessMessage('CUIS obtenido correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingCuis(false);
    }
  };

  const handleObtenerCufd = async () => {
    if (!restaurantId) return;
    setSyncingCufd(true);
    setError(null);
    try {
      const res = await fetch('/api/siat/cufd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error obteniendo CUFD');
      
      setCufd(data.cufd);
      setCufdFecha(data.fechaVigencia);
      setSuccessMessage('CUFD generado correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingCufd(false);
    }
  };

  const handleSincronizar = async () => {
    if (!restaurantId) return;
    setSyncingCatalogos(true);
    setError(null);
    try {
      const res = await fetch('/api/siat/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error sincronizando catálogos');
      
      setActividad(data.actividad);
      setProducto(data.producto);
      setSuccessMessage('Catálogos sincronizados correctamente');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingCatalogos(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-100 h-64 rounded-2xl"></div>;
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2 mb-1">
          <ShieldCheck size={20} className="text-[#E76F51]" />
          Configuración Facturación SIAT
        </h2>
        <p className="text-[#6B7280] text-sm mb-4">
          Configura tus credenciales y firma digital para la facturación electrónica boliviana en línea.
        </p>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 animate-in fade-in">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 animate-in fade-in">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NIT */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Hash size={14} className="text-[#6B7280]" />
              NIT de la Empresa
            </label>
            <input
              type="text"
              value={nit}
              onChange={e => setNit(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Ej. 123456789"
              required
            />
          </div>

          {/* Sucursal */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Building size={14} className="text-[#6B7280]" />
              Código de Sucursal
            </label>
            <input
              type="number"
              value={sucursal}
              onChange={e => setSucursal(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              min="0"
              required
            />
          </div>

          {/* Punto de Venta */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Building size={14} className="text-[#6B7280]" />
              Punto de Venta
            </label>
            <input
              type="number"
              value={puntoVenta}
              onChange={e => setPuntoVenta(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              min="0"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
              <Lock size={14} className="text-[#6B7280]" />
              Contraseña del Certificado .p12
            </label>
            <input
              type="password"
              value={certPassword}
              onChange={e => setCertPassword(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Contraseña del archivo de AGETIC"
              required
            />
          </div>
        </div>

        {/* Certificado p12 Upload */}
        <div className="border border-dashed border-[#E5E7EB] rounded-xl p-6 bg-[#F9FAFB]">
          <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
            <Upload size={14} className="text-[#6B7280]" />
            Archivo de Firma Digital (.p12)
          </label>
          <p className="text-xs text-[#6B7280] mb-4">
            Sube el archivo de tu certificado de AGETIC. Este archivo se guardará de forma encriptada en tu servidor.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".p12"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCertFile(file);
              }}
              className="hidden"
              id="p12-upload"
            />
            <label
              htmlFor="p12-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] bg-white rounded-xl text-sm font-medium text-[#4B5563] hover:bg-gray-50 transition-colors"
            >
              <Upload size={16} />
              Seleccionar archivo
            </label>
            <span className="text-sm text-[#6B7280]">
              {certFile ? certFile.name : 'Ningún archivo nuevo seleccionado'}
            </span>
          </div>
        </div>

        {/* Status Info (Read Only) */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-[#4B5563] space-y-2 border border-[#E5E7EB]">
          <p className="font-medium text-[#1F2933] mb-2">Estado Actual de Conexión</p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span>CUIS Vigente:</span>
              <span className="font-mono text-[#E76F51]">{cuis ? cuis : 'No asignado'}</span>
            </div>
            <div className="flex justify-between">
              <span>CUFD Diario:</span>
              <span className="font-mono text-[#E76F51]">{cufd ? 'Activo (Oculto)' : 'No asignado'}</span>
            </div>
            {cufdFecha && (
              <div className="flex justify-between">
                <span>Vigencia CUFD:</span>
                <span>{new Date(cufdFecha).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Actividad Principal:</span>
              <span className="font-mono text-[#E76F51]">{actividad ? actividad : 'No asignado'}</span>
            </div>
            <div className="flex justify-between">
              <span>Producto Principal:</span>
              <span className="font-mono text-[#E76F51]">{producto ? producto : 'No asignado'}</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 pt-3 mt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={handleObtenerCuis}
              disabled={syncingCuis || !nit || saving}
              className="flex-1 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#4B5563] font-medium rounded-lg transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1"
            >
              {syncingCuis ? 'Conectando...' : '1. Solicitar CUIS'}
            </button>
            <button
              type="button"
              onClick={handleObtenerCufd}
              disabled={syncingCufd || !cuis || saving}
              className="flex-1 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#4B5563] font-medium rounded-lg transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1"
            >
              {syncingCufd ? 'Generando...' : '2. Generar CUFD'}
            </button>
            <button
              type="button"
              onClick={handleSincronizar}
              disabled={syncingCatalogos || !cuis || saving}
              className="flex-1 py-2 bg-[#E76F51]/10 text-[#E76F51] hover:bg-[#E76F51]/20 font-medium rounded-lg transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1"
            >
              {syncingCatalogos ? 'Sincronizando...' : '3. Sincronizar'}
            </button>
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
            {saving ? 'Guardando...' : 'Guardar Configuración SIAT'}
          </button>
        </div>
      </form>
    </div>
  );
}
