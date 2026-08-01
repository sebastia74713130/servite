'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useSubsections } from '@/hooks/useSubsections';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';
import { ImageCropperModal } from '@/components/ImageCropperModal';
import { ArrowLeft, Save, Upload, X, Trash2, GripVertical, Eye, EyeOff, Plus, Image as ImageIcon, Wand2, Moon, Sun } from 'lucide-react';
import PublicMenuClient from '@/app/m/[restaurantSlug]/[tableCode]/PublicMenuClient';
import { extractDominantColor } from '@/lib/colorUtils';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── Sortable Category Item ───────────────────────────────────────── */
function SortableCategoryItem({ category, onToggleVisibility, onColorChange, onTextColorChange }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-[#E5E7EB] rounded-xl mb-3 flex items-center overflow-hidden shadow-sm">
      <div {...attributes} {...listeners} className="p-3 cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#1F2933]">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 py-3 pr-3 flex items-center justify-between">
        <span className="font-medium text-[#1F2933]">{category.name}</span>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">Fondo</span>
            <input
              type="color"
              value={category.page_background_color || '#F9FAFB'}
              onChange={(e) => onColorChange(category.id, e.target.value)}
              title="Color de fondo individual"
              className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">Texto</span>
            <input
              type="color"
              value={category.page_text_color || '#1F2933'}
              onChange={(e) => onTextColorChange(category.id, e.target.value)}
              title="Color de texto individual"
              className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
            />
          </div>
          <button 
            onClick={() => onToggleVisibility(category.id)}
            className={`text-sm ${category.is_active ? 'text-green-600' : 'text-gray-400'}`}
          >
            {category.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Editor Page ───────────────────────────────────────────── */
export default function MenuDesignPage() {
  const router = useRouter();
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const { categories: initialCategories, loading: catLoading } = useCategories(restaurant?.id, branch?.id);
  const { products, loading: prodLoading } = useProducts(restaurant?.id, branch?.id);
  const catIds = initialCategories ? initialCategories.map(c => c.id) : [];
  const { subsections: initialSubsections, loading: subLoading } = useSubsections(catIds);

  // Local state for the editor
  const [editorCategories, setEditorCategories] = useState<any[]>([]);
  const [editorSubsections, setEditorSubsections] = useState<any[]>([]);
  const [editorProducts, setEditorProducts] = useState<any[]>([]);
  
  const [menuBgColor, setMenuBgColor] = useState('#F9FAFB');
  const [menuTextColor, setMenuTextColor] = useState('#1F2933');
  const [brandColor, setBrandColor] = useState('#E76F51');
  const [menuShadows, setMenuShadows] = useState(true);
  
  // Selected category in editor
  const [selectedEditorCatId, setSelectedEditorCatId] = useState<string | null>(null);
  
  // Images
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);

  // Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'cover' | 'bg' | 'sub_banner' | 'cat_icon' | null>(null);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!catLoading && initialCategories) {
      setEditorCategories(initialCategories);
    }
  }, [initialCategories, catLoading]);

  useEffect(() => {
    if (!subLoading && initialSubsections) {
      setEditorSubsections(initialSubsections);
    }
  }, [initialSubsections, subLoading]);

  useEffect(() => {
    if (!prodLoading && products) {
      setEditorProducts(products);
    }
  }, [products, prodLoading]);

  useEffect(() => {
    if (restaurant) {
      const rawBg = restaurant.menu_background_color || '#F9FAFB';
      if (rawBg.includes('|noshadow')) {
        setMenuShadows(false);
        setMenuBgColor(rawBg.replace('|noshadow', ''));
      } else {
        setMenuShadows(true);
        setMenuBgColor(rawBg);
      }
      setMenuTextColor(restaurant.menu_text_color || '#1F2933');
      setBrandColor(restaurant.brand_color || '#E76F51');
      setCoverUrl(restaurant.cover_url || null);
      setBgImageUrl(restaurant.menu_background_image_url || null);
    }
  }, [restaurant]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setEditorCategories((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        return newArray.map((item, index) => ({ ...item, sort_order: index }));
      });
    }
  };

  const handleDragEndSubsections = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setEditorSubsections((items) => {
        const categorySubsections = items.filter(s => s.category_id === selectedEditorCatId);
        const otherSubsections = items.filter(s => s.category_id !== selectedEditorCatId);
        
        const oldIndex = categorySubsections.findIndex(i => i.id === active.id);
        const newIndex = categorySubsections.findIndex(i => i.id === over.id);
        const newArray = arrayMove(categorySubsections, oldIndex, newIndex);
        
        const reorderedSubsections = newArray.map((item, index) => ({ ...item, sort_order: index }));
        return [...otherSubsections, ...reorderedSubsections];
      });
    }
  };

  const handleToggleCatVisibility = (id: string) => {
    setEditorCategories(cats => cats.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleCatColorChange = (id: string, color: string) => {
    setEditorCategories(cats => cats.map(c => c.id === id ? { ...c, page_background_color: color } : c));
  };
  
  const handleCatTextColorChange = (id: string, color: string) => {
    setEditorCategories(cats => cats.map(c => c.id === id ? { ...c, page_text_color: color } : c));
  };

  const applyGlobalBackgroundToCategories = () => {
    if (confirm("¿Estás seguro de que deseas sobreescribir el color de fondo individual de todas las secciones con este color general?")) {
      setEditorCategories(cats => cats.map(c => ({ ...c, page_background_color: menuBgColor })));
    }
  };

  const applyGlobalTextToCategories = () => {
    if (confirm("¿Estás seguro de que deseas sobreescribir el color de texto individual de todas las secciones con este color general?")) {
      setEditorCategories(cats => cats.map(c => ({ ...c, page_text_color: menuTextColor })));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Upload new cover if needed
      let finalCover = coverUrl;
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `cover_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `restaurants/${restaurant.id}/${fileName}`;
        const { error } = await supabase.storage.from('branding').upload(filePath, coverFile);
        if (!error) {
          const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
          finalCover = data.publicUrl;
        }
      }

      // 2. Upload new bg image if needed
      let finalBgImage = bgImageUrl;
      if (bgImageFile) {
        const fileExt = bgImageFile.name.split('.').pop();
        const fileName = `bg_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `restaurants/${restaurant.id}/${fileName}`;
        const { error } = await supabase.storage.from('branding').upload(filePath, bgImageFile);
        if (!error) {
          const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
          finalBgImage = data.publicUrl;
        }
      }

      // 3. Update restaurant global settings
      await supabase.from('restaurants').update({
        cover_url: finalCover,
        brand_color: brandColor,
        menu_background_color: menuShadows ? menuBgColor : `${menuBgColor}|noshadow`,
        menu_background_image_url: finalBgImage,
        menu_text_color: menuTextColor,
      }).eq('id', restaurant.id);

      // 4. Update categories: upsert and delete
      const categoryIdsToKeep = editorCategories.map(c => c.id).filter(id => !id.startsWith('temp_'));
      
      const upsertCategories = [];
      for (const cat of editorCategories) {
        let finalCatCover = cat.cover_url;
        if (cat._pendingCoverFile) {
          const fileExt = cat._pendingCoverFile.name.split('.').pop();
          const fileName = `cat_cover_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `restaurants/${restaurant.id}/${fileName}`;
          const { error } = await supabase.storage.from('branding').upload(filePath, cat._pendingCoverFile);
          if (!error) {
            const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
            finalCatCover = data.publicUrl;
          }
        }
        
        let finalCatImage = cat.image_url;
        if (cat._pendingImageFile) {
          const fileExt = cat._pendingImageFile.name.split('.').pop();
          const fileName = `cat_icon_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `restaurants/${restaurant.id}/${fileName}`;
          const { error } = await supabase.storage.from('branding').upload(filePath, cat._pendingImageFile);
          if (!error) {
            const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
            finalCatImage = data.publicUrl;
          }
        }
      
        upsertCategories.push({
          id: cat.id,
          restaurant_id: restaurant.id,
          branch_id: branch.id,
          name: cat.name,
          sort_order: cat.sort_order,
          is_active: cat.is_active,
          page_background_color: cat.page_background_color,
          page_text_color: cat.page_text_color,
          background_color: cat.background_color,
          cover_url: finalCatCover,
          image_url: finalCatImage,
        });
      }
      
      // Get existing categories to find which ones to delete
      const existingCatsRes = await supabase.from('categories').select('id').eq('branch_id', branch.id);
      const existingCatIds = existingCatsRes.data?.map(c => c.id) || [];
      const catsToDelete = existingCatIds.filter(id => !editorCategories.find(c => c.id === id));
      
      if (catsToDelete.length > 0) {
        const { error } = await supabase.from('categories').delete().in('id', catsToDelete);
        if (error) throw new Error("Error deleting categories: " + error.message);
      }
      
      if (upsertCategories.length > 0) {
        const { error } = await supabase.from('categories').upsert(upsertCategories);
        if (error) throw new Error("Error upserting categories: " + error.message);
      }

      // 5. Update subsections: upsert and delete
      const upsertSubsections = [];
      for (const sub of editorSubsections) {
        let finalSubImage = sub.image_url;
        if (sub._pendingImageFile) {
          const fileExt = sub._pendingImageFile.name.split('.').pop();
          const fileName = `sub_banner_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `restaurants/${restaurant.id}/${fileName}`;
          const { error } = await supabase.storage.from('branding').upload(filePath, sub._pendingImageFile);
          if (!error) {
            const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
            finalSubImage = data.publicUrl;
          }
        }
        upsertSubsections.push({
          id: sub.id,
          category_id: sub.category_id,
          name: sub.name,
          sort_order: sub.sort_order,
          background_color: sub.background_color || null,
          text_color: sub.text_color || null,
          typography: sub.typography || 'sans',
          image_url: finalSubImage,
        });
      }
      
      const categoryIds = editorCategories.map(c => c.id);
      const existingSubsRes = categoryIds.length > 0 
        ? await supabase.from('subsections').select('id').in('category_id', categoryIds)
        : { data: [] };
      const existingSubIds = existingSubsRes.data?.map(s => s.id) || [];
      const subsToDelete = existingSubIds.filter(id => !editorSubsections.find(s => s.id === id));
      
      if (subsToDelete.length > 0) {
        const { error } = await supabase.from('subsections').delete().in('id', subsToDelete);
        if (error) throw new Error("Error deleting subsections: " + error.message);
      }
      
      if (upsertSubsections.length > 0) {
        const { error } = await supabase.from('subsections').upsert(upsertSubsections);
        if (error) throw new Error("Error upserting subsections: " + error.message);
      }

      // 6. Update product colors
      const upsertProducts = editorProducts
        .filter(p => {
           const orig = products?.find(op => op.id === p.id);
           return orig && (orig.card_background_color !== p.card_background_color || orig.card_text_color !== p.card_text_color);
        })
        .map(p => ({
          id: p.id,
          card_background_color: p.card_background_color,
          card_text_color: p.card_text_color
        }));

      if (upsertProducts.length > 0) {
        for(const p of upsertProducts) {
           await supabase.from('products').update({ 
             card_background_color: p.card_background_color, 
             card_text_color: p.card_text_color 
           }).eq('id', p.id);
        }
      }

      alert("Cambios guardados con éxito.");
      window.location.href = '/menu';
    } catch (e: any) {
      console.error(e);
      alert('Error guardando los cambios: ' + (e.message || e.toString()));
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTheme = async () => {
    const sourceImage = restaurant?.logo_url || coverUrl;
    if (!sourceImage) {
      alert('Sube un logo (en Configuración) o una Portada para extraer el color automáticamente.');
      return;
    }
    const color = await extractDominantColor(sourceImage);
    if (color) {
      setBrandColor(color);
      setMenuBgColor('#F9FAFB');
      setMenuTextColor('#1F2933');
      setMenuShadows(true);
    } else {
      alert('No se pudo extraer el color de la imagen.');
    }
  };

  const applyClassicTheme = () => {
    setMenuBgColor('#F9FAFB');
    setMenuTextColor('#1F2933');
    setMenuShadows(true);
  };

  const applyDarkTheme = () => {
    setMenuBgColor('#111827');
    setMenuTextColor('#F9FAFB');
    setMenuShadows(false);
  };

  if (sessionLoading) return <LoadingState />;

  // Create a mock table and restaurant object for the public menu client
  const mockTable = { id: 'mock', table_code: 'preview' };
  const mockRestaurant = {
    ...restaurant,
    cover_url: coverUrl,
    menu_background_color: menuBgColor,
    menu_text_color: menuTextColor,
    menu_background_image_url: bgImageUrl,
    brand_color: brandColor,
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 bg-gray-50 overflow-hidden">
      {/* ─── Left Panel: Controls ─────────────────────────────────── */}
      <div className="w-[450px] bg-white border-r border-[#E5E7EB] flex flex-col h-full shadow-sm z-10 flex-shrink-0">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/menu')} className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Diseño del Menú</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#E76F51] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#D4604A] disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Cover Section */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
              {selectedEditorCatId 
                ? `Portada de Sección: ${editorCategories.find(c => c.id === selectedEditorCatId)?.name || ''}` 
                : 'Portada Principal'}
            </h2>
            <div className="bg-gray-100 border border-gray-200 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
              {(() => {
                const activeCoverUrl = selectedEditorCatId 
                  ? editorCategories.find(c => c.id === selectedEditorCatId)?.cover_url 
                  : coverUrl;
                  
                return activeCoverUrl ? (
                  <>
                    <img src={activeCoverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                      <Upload size={16} />
                      Cambiar
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setCropType('cover'); setCropImageSrc(URL.createObjectURL(file)); }
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => {
                        if (selectedEditorCatId) {
                          setEditorCategories(cats => cats.map(c => 
                            c.id === selectedEditorCatId ? { ...c, cover_url: null, _pendingCoverFile: undefined } : c
                          ));
                        } else {
                          setCoverUrl(null);
                          setCoverFile(null);
                        }
                      }}
                      className="bg-white/80 hover:bg-white text-red-500 p-2 rounded-lg backdrop-blur-sm transition-colors shadow-sm"
                      title="Eliminar portada"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-6 w-full h-full">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm text-gray-400">
                    <Upload size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Subir foto de portada</span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCropType('cover'); setCropImageSrc(URL.createObjectURL(file)); }
                    }}
                  />
                </label>
              );
            })()}
            </div>
          </section>

          {!selectedEditorCatId ? (
            <>
              {/* Quick Themes */}
              <section className="mb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Temas Rápidos</h2>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={handleAutoTheme} className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-[#E76F51] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                      <Wand2 size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Auto<br/>Magia</span>
                  </button>
                  <button onClick={applyClassicTheme} className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm">
                      <Sun size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">Clásico<br/>Claro</span>
                  </button>
                  <button onClick={applyDarkTheme} className="flex flex-col items-center justify-center gap-2 p-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 shadow-sm">
                      <Moon size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">Oscuro<br/>Elegante</span>
                  </button>
                </div>
              </section>

              {/* Global Colors */}
              <section>
                <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Colores Globales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-2">Color de Marca (Principal)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    className="w-10 h-10 flex-shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                  />
                  <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 uppercase" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Fondo del Menú</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={menuBgColor}
                    onChange={e => setMenuBgColor(e.target.value)}
                    className="w-10 h-10 flex-shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                  />
                  <input type="text" value={menuBgColor} onChange={e => setMenuBgColor(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 uppercase" />
                </div>
                <button onClick={applyGlobalBackgroundToCategories} className="text-[10px] text-blue-600 mt-2 font-medium hover:underline block">
                  Aplicar este color a todas las secciones
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Color de Texto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={menuTextColor}
                    onChange={e => setMenuTextColor(e.target.value)}
                    className="w-10 h-10 flex-shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                  />
                  <input type="text" value={menuTextColor} onChange={e => setMenuTextColor(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 uppercase" />
                </div>
                <button onClick={applyGlobalTextToCategories} className="text-[10px] text-blue-600 mt-2 font-medium hover:underline block">
                  Aplicar este color a todas las secciones
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900 block">Sombras de Tarjetas</span>
                <span className="text-xs text-gray-500 block mt-0.5">Muestra un ligero sombreado en productos y banners</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={menuShadows} onChange={e => setMenuShadows(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E76F51]"></div>
              </label>
            </div>
          </section>

          {/* Global Background Image */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Imagen de Fondo Global</h2>
            <div className="bg-gray-100 border border-gray-200 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden group min-h-[120px]">
              {bgImageUrl ? (
                <>
                  <img src={bgImageUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                      <Upload size={16} />
                      Cambiar
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setCropType('bg'); setCropImageSrc(URL.createObjectURL(file)); }
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => { setBgImageUrl(null); setBgImageFile(null); }}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 shadow-sm flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Quitar
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-4 w-full h-full">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm text-gray-400">
                    <Upload size={16} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 text-center">Subir patrón o imagen<br/>para el fondo</span>
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCropType('bg'); setCropImageSrc(URL.createObjectURL(file)); }
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Esta imagen se dibujará de fondo cubriendo toda la pantalla.</p>
          </section>

          {/* Sections (Categories) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Orden y Visibilidad de Secciones</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Arrastra para reordenar o pulsa el ícono del ojo para ocultar secciones de la vista pública. También puedes modificar el color de fondo individual aquí.</p>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={editorCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {editorCategories.map((cat) => (
                  <SortableCategoryItem 
                    key={cat.id} 
                    category={cat} 
                    onToggleVisibility={handleToggleCatVisibility}
                    onColorChange={handleCatColorChange}
                    onTextColorChange={handleCatTextColorChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            <button
              onClick={() => {
                const newCat = {
                  id: crypto.randomUUID(),
                  restaurant_id: restaurant.id,
                  branch_id: branch.id,
                  name: 'Nueva Sección',
                  is_active: true,
                  sort_order: editorCategories.length,
                  isNew: true
                };
                setEditorCategories([...editorCategories, newCat]);
                setSelectedEditorCatId(newCat.id);
              }}
              className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Añadir Sección
            </button>
          </section>
          </>
          ) : (
            <section className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Ajustes de Sección</h2>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editorCategories.find(c => c.id === selectedEditorCatId)?.name || ''}
                        onChange={(e) => {
                          setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, name: e.target.value } : c));
                        }}
                        className="flex-1 px-3 py-2 border rounded-xl font-medium focus:ring-2 focus:ring-[#E76F51] focus:border-transparent outline-none"
                        placeholder="Nombre de la sección"
                      />
                      <button
                        onClick={() => {
                          if (confirm("¿Estás seguro de eliminar esta sección? Esto eliminará también sus subsecciones. Sus productos quedarán sin sección.")) {
                            setEditorCategories(cats => cats.filter(c => c.id !== selectedEditorCatId));
                            setSelectedEditorCatId(null);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100 flex-shrink-0"
                        title="Eliminar sección"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 justify-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-medium">Fondo</span>
                          <input
                            type="color"
                            value={editorCategories.find(c => c.id === selectedEditorCatId)?.page_background_color || '#F9FAFB'}
                            onChange={(e) => {
                              setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, page_background_color: e.target.value } : c));
                            }}
                            title="Color de fondo"
                            className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-medium">Texto</span>
                          <input
                            type="color"
                            value={editorCategories.find(c => c.id === selectedEditorCatId)?.page_text_color || '#1F2933'}
                            onChange={(e) => {
                              setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, page_text_color: e.target.value } : c));
                            }}
                            title="Color de texto"
                            className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 justify-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-medium">Botón</span>
                          <input
                            type="color"
                            value={editorCategories.find(c => c.id === selectedEditorCatId)?.background_color || '#FFFFFF'}
                            onChange={(e) => {
                              setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, background_color: e.target.value } : c));
                            }}
                            title="Color del botón (píldora)"
                            className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Texto Botón</span>
                          <input
                            type="color"
                            value={editorCategories.find(c => c.id === selectedEditorCatId)?.text_color || '#FFFFFF'}
                            onChange={(e) => {
                              setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, text_color: e.target.value } : c));
                            }}
                            title="Color de texto del botón"
                            className="w-6 h-6 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 justify-between">
                      <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Ícono (Botón)</span>
                      <div className="flex items-center gap-2">
                        {(editorCategories.find(c => c.id === selectedEditorCatId)?._pendingImagePreview || editorCategories.find(c => c.id === selectedEditorCatId)?.image_url) && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                            <img src={editorCategories.find(c => c.id === selectedEditorCatId)?._pendingImagePreview || editorCategories.find(c => c.id === selectedEditorCatId)?.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <label className="cursor-pointer text-xs font-medium border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50">
                          Subir
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setCropTargetId(selectedEditorCatId);
                                setCropType('cat_icon');
                                setCropImageSrc(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        {(editorCategories.find(c => c.id === selectedEditorCatId)?._pendingImagePreview || editorCategories.find(c => c.id === selectedEditorCatId)?.image_url) && (
                          <button onClick={() => setEditorCategories(cats => cats.map(c => c.id === selectedEditorCatId ? { ...c, image_url: null, _pendingImageFile: undefined, _pendingImagePreview: undefined } : c))} className="text-red-500 text-xs hover:underline">Quitar</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              {editorProducts.filter(p => p.category_id === selectedEditorCatId).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 mt-6">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Colores de Productos</h2>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Personaliza el fondo y el texto de cada producto de forma individual en esta sección.</p>
                  <div className="space-y-3">
                    {editorProducts.filter(p => p.category_id === selectedEditorCatId).sort((a, b) => a.sort_order - b.sort_order).map(prod => (
                      <div key={prod.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
                         <span className="text-sm font-medium text-gray-700 truncate mr-2">{prod.name}</span>
                         <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="color"
                              value={prod.card_background_color || '#FFFFFF'}
                              onChange={(e) => setEditorProducts(prods => prods.map(p => p.id === prod.id ? { ...p, card_background_color: e.target.value } : p))}
                              title="Color de fondo del producto"
                              className="w-5 h-5 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                            />
                            <input
                              type="color"
                              value={prod.card_text_color || '#1F2933'}
                              onChange={(e) => setEditorProducts(prods => prods.map(p => p.id === prod.id ? { ...p, card_text_color: e.target.value } : p))}
                              title="Color de texto del producto"
                              className="w-5 h-5 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                            />
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Subsecciones</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">Agrega subsecciones (ej. Cervezas, Vinos, Gaseosas) dentro de esta sección. Los clientes verán un filtro rápido bajo la categoría principal.</p>
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSubsections}>
                  <SortableContext items={editorSubsections.filter(s => s.category_id === selectedEditorCatId).map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {editorSubsections.filter(s => s.category_id === selectedEditorCatId).map((sub) => (
                      <div key={sub.id} className="bg-white border border-[#E5E7EB] rounded-xl mb-3 flex flex-col overflow-hidden shadow-sm p-3 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#1F2933]">
                            <GripVertical size={16} />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={sub.name}
                              onChange={(e) => setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, name: e.target.value } : s))}
                              className="flex-1 bg-transparent font-medium text-sm outline-none border-b border-transparent focus:border-gray-300 min-w-0"
                              placeholder="Nombre de subsección"
                            />
                            <div className="flex items-center gap-4 ml-2 flex-shrink-0">
                              <div className="flex items-center gap-1.5" title="Color de texto">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Texto</span>
                                <input
                                  type="color"
                                  value={sub.text_color || '#1F2933'}
                                  onChange={(e) => setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, text_color: e.target.value } : s))}
                                  className="w-5 h-5 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                                />
                              </div>
                              <div className="flex items-center gap-1.5" title="Color de fondo del área de los productos">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Área</span>
                                <input
                                  type="color"
                                  value={(sub.typography || 'sans').split(',')[2] || '#FFFFFF'}
                                  onChange={(e) => {
                                    const parts = (sub.typography || 'sans').split(',');
                                    const font = parts[0] || 'sans';
                                    const align = parts[1] || 'left';
                                    setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, typography: `${font},${align},${e.target.value}` } : s));
                                  }}
                                  className="w-5 h-5 flex-shrink-0 rounded cursor-pointer border border-gray-300 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditorSubsections(subs => subs.filter(s => s.id !== sub.id))}
                            className="text-gray-400 hover:text-red-500 ml-2"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3 pl-8">
                          <select
                            value={(sub.typography || 'sans').split(',')[0]}
                            onChange={e => {
                              const currentAlign = (sub.typography || 'sans').split(',')[1] || 'left';
                              setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, typography: `${e.target.value},${currentAlign}` } : s));
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-[#E76F51]"
                          >
                            <option value="sans">Moderno</option>
                            <option value="serif">Clásico</option>
                            <option value="mono">Máquina</option>
                          </select>

                          <select
                            value={(sub.typography || 'sans').split(',')[1] || 'left'}
                            onChange={e => {
                              const currentFont = (sub.typography || 'sans').split(',')[0];
                              setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, typography: `${currentFont},${e.target.value}` } : s));
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-[#E76F51]"
                          >
                            <option value="left">Izquierda</option>
                            <option value="center">Centro</option>
                            <option value="right">Derecha</option>
                          </select>
                          
                          <div className="flex items-center gap-2">
                            {(sub._pendingImagePreview || sub.image_url) && (
                              <div className="w-10 h-6 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                <img src={sub._pendingImagePreview || sub.image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <label className="cursor-pointer text-xs font-medium border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50 bg-white">
                              Banner
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCropTargetId(sub.id);
                                    setCropType('sub_banner');
                                    setCropImageSrc(URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </label>
                            {(sub._pendingImagePreview || sub.image_url) && (
                              <button
                                onClick={() => setEditorSubsections(subs => subs.map(s => s.id === sub.id ? { ...s, image_url: null, _pendingImageFile: undefined, _pendingImagePreview: undefined } : s))}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
                
                <button
                  onClick={() => {
                    const currentSubs = editorSubsections.filter(s => s.category_id === selectedEditorCatId);
                    const newSub = {
                      id: crypto.randomUUID(),
                      branch_id: branch.id,
                      category_id: selectedEditorCatId,
                      name: 'Nueva Subsección',
                      sort_order: currentSubs.length,
                      isNew: true
                    };
                    setEditorSubsections([...editorSubsections, newSub]);
                  }}
                  className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Añadir Subsección
                </button>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ─── Right Panel: Live Preview ──────────────────────────────── */}
      <div className="flex-1 flex flex-col relative items-center bg-gray-100 overflow-y-auto p-4 md:p-8">
        
        {/* Phone Frame Simulator */}
        <div 
          className="w-[390px] h-[844px] bg-white rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col flex-shrink-0 mx-auto my-auto ring-8 ring-gray-900 ring-opacity-5"
          style={{ transform: 'translateZ(0)' }}
        >
          {/* Dynamic Island / Notch Simulation */}
          <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pointer-events-none">
            <div className="w-32 h-6 bg-black rounded-b-2xl"></div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10 bg-white/0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <PublicMenuClient 
                table={mockTable}
                restaurant={mockRestaurant}
                categories={editorCategories}
                products={editorProducts}
                subsections={editorSubsections}
                isPreviewMode={true}
                onCategoryChange={setSelectedEditorCatId}
                externalSelectedCatId={selectedEditorCatId}
              />
          </div>
        </div>
      </div>

      {/* Cropper Modal */}
      {cropImageSrc && cropType && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          aspect={
            cropType === 'cover' ? 21/9 :
            cropType === 'bg' ? 9/16 :
            cropType === 'sub_banner' ? 4/1 :
            1 // cat_icon
          }
          recommendedSize={
            cropType === 'cover' ? '840 x 360 px' :
            cropType === 'bg' ? '1080 x 1920 px' :
            cropType === 'sub_banner' ? '800 x 200 px' :
            '200 x 200 px' // cat_icon
          }
          onCropComplete={(croppedBlob) => {
            const file = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
            const localUrl = URL.createObjectURL(file);
            
            if (cropType === 'cover') {
              if (selectedEditorCatId) {
                setEditorCategories(cats => cats.map(c => 
                  c.id === selectedEditorCatId ? { ...c, cover_url: localUrl, _pendingCoverFile: file } : c
                ));
              } else {
                setCoverFile(file);
                setCoverUrl(localUrl);
              }
            } else if (cropType === 'bg') {
              setBgImageFile(file);
              setBgImageUrl(localUrl);
            } else if (cropType === 'sub_banner' && cropTargetId) {
              setEditorSubsections(subs => subs.map(s => s.id === cropTargetId ? { 
                ...s, 
                _pendingImageFile: file,
                _pendingImagePreview: localUrl
              } : s));
            } else if (cropType === 'cat_icon' && cropTargetId) {
              setEditorCategories(cats => cats.map(c => c.id === cropTargetId ? { 
                ...c, 
                _pendingImageFile: file,
                _pendingImagePreview: localUrl
              } : c));
            }
            
            setCropImageSrc(null);
            setCropType(null);
            setCropTargetId(null);
          }}
          onCancel={() => { 
            setCropImageSrc(null); 
            setCropType(null); 
            setCropTargetId(null); 
          }}
        />
      )}
    </div>
  );
}
