import { useState } from 'react';
import { X, Upload, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';

interface ParsedProduct {
  name: string;
  description: string;
  price: number;
}

interface ParsedTheme {
  brand_color?: string;
  background_color?: string;
  text_color?: string;
}

interface ParsedCategory {
  name: string;
  products: ParsedProduct[];
}

export function MenuScanner({
  restaurantId,
  branchId,
  onSaved,
  onSkip
}: {
  restaurantId: string;
  branchId: string;
  onSaved: () => void;
  onSkip: () => void;
}) {
  const [filesData, setFilesData] = useState<{data: string, mimeType: string, name: string}[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCategory[] | null>(null);
  const [parsedTheme, setParsedTheme] = useState<ParsedTheme | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    const newFilesData: {data: string, mimeType: string, name: string}[] = [];

    for (const file of selectedFiles) {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newFilesData.push({ data: base64, mimeType: file.type, name: file.name });
      } else if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1200, 0.8);
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });
        newFilesData.push({ data: base64, mimeType: file.type, name: file.name });
      }
    }
    
    setFilesData(prev => [...prev, ...newFilesData]);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (filesData.length === 0) return;
    setAnalyzing(true);
    setError('');

    try {
      const res = await fetch('/api/menu/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesData })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar la imagen');
      }

      if (!data.categories || data.categories.length === 0) {
        throw new Error('No se encontraron categorías en el menú.');
      }

      setParsedData(data.categories);
      if (data.theme) {
        setParsedTheme(data.theme);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;
    setSaving(true);
    setError('');

    try {
      // Clean and validate data before saving
      const validData = parsedData.map(cat => ({
        ...cat,
        products: cat.products.map(p => ({
          ...p,
          price: parseFloat(String(p.price)) || 0
        }))
      }));

      // Get current max sort order for categories
      const { data: existingCats } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: false })
        .limit(1);
        
      let currentSortOrder = (existingCats && existingCats.length > 0) ? (existingCats[0].sort_order || 0) : 0;

      for (const category of validData) {
        currentSortOrder += 10;
        
        // 1. Insert Category
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({
            restaurant_id: restaurantId,
            branch_id: branchId,
            name: category.name,
            sort_order: currentSortOrder,
            is_active: true
          })
          .select()
          .single();

        if (catError) throw new Error(`Error al crear la categoría: ${catError.message}`);
        if (!newCat) continue;

        // 2. Prepare Products
        if (category.products && category.products.length > 0) {
          const productsToInsert = category.products.map(p => ({
            restaurant_id: restaurantId,
            branch_id: branchId,
            category_id: newCat.id,
            name: p.name,
            description: p.description || null,
            price: p.price || 0,
            is_active: true,
            is_available: true
          }));

          // 3. Insert Products in bulk
          const { error: prodError } = await supabase
            .from('products')
            .insert(productsToInsert);

          if (prodError) throw new Error(`Error al crear productos: ${prodError.message}`);
        }
      }

      // Update theme if provided
      if (parsedTheme) {
        await supabase
          .from('restaurants')
          .update({
            brand_color: parsedTheme.brand_color || null,
            menu_background_color: parsedTheme.background_color || null,
            menu_text_color: parsedTheme.text_color || null,
          })
          .eq('id', restaurantId);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <h2 className="text-xl font-bold text-[#1F2933] flex items-center gap-2">
          <Sparkles className="text-[#E76F51]" />
          Escanear Menú con IA
        </h2>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!parsedData ? (
            <div className="space-y-6">
              <p className="text-[#4B5563] text-sm text-center">
                Sube fotos de tu menú físico o un archivo PDF. Nuestra Inteligencia Artificial leerá el texto y generará tus categorías y productos mágicamente.
              </p>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#D1D5DB] rounded-2xl bg-white p-6 transition-colors hover:border-[#E76F51]/50">
                {filesData.length > 0 ? (
                  <div className="w-full flex flex-col gap-2 mb-4">
                    {filesData.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#F9FAFB] border border-[#E5E7EB] p-3 rounded-xl">
                        <span className="text-sm font-medium text-[#1F2933] truncate">{f.name}</span>
                        <button onClick={() => setFilesData(filesData.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-[#FDF0EC] text-[#E76F51] rounded-full flex items-center justify-center mb-4">
                    <Upload size={28} />
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="menu-upload"
                />
                <label
                  htmlFor="menu-upload"
                  className="cursor-pointer bg-white border border-[#E5E7EB] text-[#4B5563] px-6 py-2.5 rounded-xl font-medium hover:bg-[#F9FAFB] transition-colors shadow-sm"
                >
                  {filesData.length > 0 ? 'Añadir más archivos' : 'Seleccionar archivos'}
                </label>
              </div>

              {filesData.length > 0 && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full flex items-center justify-center gap-2 bg-[#1F2933] text-white font-bold py-4 rounded-xl hover:bg-[#323F4B] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analizando menú (esto puede tomar unos segundos)...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Analizar con IA
                    </>
                  )}
                </button>
              )}
              <div className="flex items-center gap-4 py-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400 font-medium">o</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <button 
                onClick={onSkip} 
                className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Omitir y crear menú luego
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm font-medium flex gap-2">
                <Check size={20} className="shrink-0" />
                <div>
                  ¡Menú escaneado con éxito!
                  <p className="text-green-600 font-normal mt-0.5 text-xs">
                    Revisa los datos antes de guardarlos. Si ves algún error, podrás editarlo después en el panel.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {parsedData.map((cat, i) => (
                  <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#E76F51]/30 transition-shadow">
                    <div className="bg-[#1F2933] text-white px-4 py-2 flex items-center">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const newData = [...parsedData];
                          newData[i].name = e.target.value;
                          setParsedData(newData);
                        }}
                        className="bg-transparent text-white font-bold w-full focus:outline-none placeholder:text-gray-400"
                        placeholder="Nombre de Categoría"
                      />
                    </div>
                    <div className="divide-y divide-[#E5E7EB]">
                      {cat.products.map((prod, j) => (
                        <div key={j} className="p-4 flex gap-4 hover:bg-[#F9FAFB] transition-colors relative group">
                          
                          {/* Botón para eliminar producto */}
                          <button 
                            onClick={() => {
                              const newData = [...parsedData];
                              newData[i].products.splice(j, 1);
                              // Si la categoría se queda sin productos, la eliminamos
                              if (newData[i].products.length === 0) newData.splice(i, 1);
                              setParsedData(newData);
                            }}
                            className="absolute right-2 top-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar plato"
                          >
                            <X size={16} />
                          </button>

                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => {
                                const newData = [...parsedData];
                                newData[i].products[j].name = e.target.value;
                                setParsedData(newData);
                              }}
                              className="font-bold text-[#1F2933] text-sm w-full bg-transparent focus:outline-none focus:border-b border-[#E76F51]/50 placeholder:text-gray-400"
                              placeholder="Nombre del producto"
                            />
                            <textarea
                              value={prod.description || ''}
                              onChange={(e) => {
                                const newData = [...parsedData];
                                newData[i].products[j].description = e.target.value;
                                setParsedData(newData);
                              }}
                              rows={2}
                              className="text-xs text-[#6B7280] w-full bg-transparent resize-none focus:outline-none focus:border-b border-[#E76F51]/50 placeholder:text-gray-400"
                              placeholder="Descripción (opcional)"
                            />
                          </div>
                          <div className="w-24 shrink-0 flex items-start mt-1">
                            <span className="text-[#E76F51] font-bold text-sm mr-1 mt-1">Bs</span>
                            <input
                              type="number"
                              value={prod.price}
                              onChange={(e) => {
                                const newData = [...parsedData];
                                newData[i].products[j].price = Number(e.target.value);
                                setParsedData(newData);
                              }}
                              className="font-bold text-[#E76F51] text-lg w-full bg-transparent focus:outline-none border-b border-transparent focus:border-[#E76F51]/50 p-0 text-right"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {parsedData && (
          <div className="p-6 border-t border-[#E5E7EB] shrink-0 bg-white rounded-b-2xl flex gap-3">
            <button
              onClick={() => { setParsedData(null); setFilesData([]); }}
              disabled={saving}
              className="flex-1 bg-white border border-[#E5E7EB] text-[#6B7280] font-bold py-3.5 rounded-xl hover:bg-[#F9FAFB] transition-colors"
            >
              Escanear de nuevo
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#E76F51] text-white font-bold py-3.5 rounded-xl hover:bg-[#d65e40] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar menú'
              )}
            </button>
          </div>
        )}
    </div>
  );
}

export function MenuScanModal({
  restaurantId,
  branchId,
  onClose,
  onSaved
}: {
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
          <button onClick={onClose} className="bg-white/80 backdrop-blur rounded-full p-2 text-[#6B7280] hover:text-[#1F2933] shadow-sm transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <MenuScanner 
            restaurantId={restaurantId} 
            branchId={branchId} 
            onSaved={onSaved} 
            onSkip={onClose} 
          />
        </div>
      </div>
    </div>
  );
}
