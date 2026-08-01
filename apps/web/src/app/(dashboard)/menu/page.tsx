'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRestaurantSession } from '@/hooks/useRestaurantSession';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useKitchenStations } from '@/hooks/useKitchenStations';
import { useSubsections } from '@/hooks/useSubsections';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';
import { Category, Product, KitchenStation } from '@shared/types';
import {
  Plus,
  X,
  Image as ImageIcon,
  Tag,
  Package,
  GripVertical,
  Check,
  AlertCircle,
  Upload,
  Palette,
  Trash2,
  Pencil,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SubsectionsModal } from './SubsectionsModal';
import { ImageCropperModal } from '@/components/ImageCropperModal';
import { MenuScanModal } from './MenuScanModal';
import { ProductGridArea } from './ProductGridArea';
import { ProductRecipeTab } from './ProductRecipeTab';
import { Sparkles } from 'lucide-react';

/* ─── helpers ────────────────────────────────────────────────────── */
function formatPrice(n: number) {
  return `Bs ${n.toLocaleString('es-BO')}`;
}

/* ─── page ───────────────────────────────────────────────────────── */
export default function MenuPage() {
  const { restaurant, branch, loading: sessionLoading } = useRestaurantSession();
  const { categories, setCategories, loading: catLoading, refetch: refetchCats } = useCategories(restaurant?.id, branch?.id);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>();
  const { products, setProducts, loading: prodLoading, refetch: refetchProds } = useProducts(restaurant?.id, branch?.id, selectedCatId);
  const { stations, loading: stationsLoading } = useKitchenStations(restaurant?.id);
  const { subsections, setSubsections, loading: subsectionsLoading, refetch: refetchSubsections } = useSubsections(selectedCatId ? [selectedCatId] : []);
  const router = useRouter();

  // modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [managingSubsectionsFor, setManagingSubsectionsFor] = useState<Category | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);

  // auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      if (setCategories) {
        setCategories(newCategories);
      }

      for (let i = 0; i < newCategories.length; i++) {
        const cat = newCategories[i];
        if (cat.sort_order !== i) {
          await supabase
            .from('categories')
            .update({ sort_order: i })
            .eq('id', cat.id);
        }
      }
      refetchCats();
    }
  };

  if (sessionLoading || catLoading || stationsLoading || subsectionsLoading) return <LoadingState />;

  const handleToggleAvailability = async (product: Product) => {
    await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id);
    refetchProds();
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setShowProdModal(true);
  };

  const openEditCategory = (c: Category) => {
    setEditingCategory(c);
    setShowCatModal(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2933]">Menú Digital</h1>
          <p className="text-[#4B5563] text-sm mt-1">Administra tus categorías, productos y el diseño de tu menú público.</p>
        </div>
        <button
          onClick={() => router.push('/menu/design')}
          className="flex items-center gap-2 bg-[#1F2933] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#323F4B] transition-colors shadow-sm"
        >
          <Palette size={18} />
          Editar diseño del menú
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-14rem)]">
      {/* ─── categories sidebar ─────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1F2933] flex items-center gap-2">
            <Tag size={18} className="text-[#E76F51]" />
            Categorías
          </h2>
          <button
            onClick={() => { setEditingCategory(null); setShowCatModal(true); }}
            className="flex items-center gap-1.5 text-sm font-medium text-[#E76F51] border border-[#E76F51] rounded-xl px-3 py-1.5 hover:bg-[#FDF0EC] transition-colors"
          >
            <Plus size={14} />
            Nueva
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={categories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map(cat => (
                <SortableCategoryItem
                  key={cat.id}
                  cat={cat}
                  isSelected={selectedCatId === cat.id}
                  onSelect={() => setSelectedCatId(cat.id)}
                  onEdit={() => openEditCategory(cat)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {categories.length === 0 && (
            <div className="text-center py-10 text-[#6B7280]">
              <Tag size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay categorías</p>
              <p className="text-xs mt-1">Crea una para empezar</p>
            </div>
          )}
        </div>
      </aside>

      {/* ─── products grid ──────────────────────────────────────── */}
      <ProductGridArea
        categories={categories}
        selectedCatId={selectedCatId}
        products={products}
        setProducts={setProducts}
        prodLoading={prodLoading}
        subsections={subsections}
        setSubsections={setSubsections}
        openEditProduct={openEditProduct}
        handleToggleAvailability={handleToggleAvailability}
        setShowScanModal={setShowScanModal}
        setEditingProduct={setEditingProduct}
        setShowProdModal={setShowProdModal}
        refetchSubsections={refetchSubsections}
        refetchProds={refetchProds}
      />

      {/* ─── Category Modal ─────────────────────────────────────── */}
      {showCatModal && (
        <CategoryModal
          category={editingCategory}
          restaurantId={restaurant?.id}
          branchId={branch?.id}
          onClose={() => { setShowCatModal(false); setEditingCategory(null); }}
          onSaved={() => { setShowCatModal(false); setEditingCategory(null); refetchCats(); }}
          onManageSubsections={(cat) => { setShowCatModal(false); setEditingCategory(null); setManagingSubsectionsFor(cat); }}
        />
      )}

      {/* ─── Subsections Modal ──────────────────────────────────── */}
      {managingSubsectionsFor && (
        <SubsectionsModal
          category={managingSubsectionsFor}
          onClose={() => {
            setManagingSubsectionsFor(null);
            refetchSubsections();
          }}
        />
      )}

      {/* ─── Product Modal ──────────────────────────────────────── */}
      {showProdModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          stations={stations}
          restaurantId={restaurant?.id}
          branchId={branch?.id}
          onClose={() => { setShowProdModal(false); setEditingProduct(null); }}
          onSaved={() => { setShowProdModal(false); setEditingProduct(null); refetchProds(); }}
        />
      )}

      {showScanModal && restaurant?.id && branch?.id && (
        <MenuScanModal
          restaurantId={restaurant.id}
          branchId={branch.id}
          onClose={() => setShowScanModal(false)}
          onSaved={() => {
            setShowScanModal(false);
            refetchCats();
            refetchProds();
          }}
        />
      )}
    </div>
    </div>
  );
}

/* ─── SortableCategoryItem ───────────────────────────────────────── */
function SortableCategoryItem({
  cat,
  isSelected,
  onSelect,
  onEdit,
}: {
  cat: Category;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full text-left p-3 rounded-2xl border transition-all group flex items-start gap-2 cursor-pointer ${
        isSelected
          ? 'bg-white border-[#E76F51] shadow-sm ring-1 ring-[#E76F51]/20'
          : 'bg-white border-[#E5E7EB] hover:border-[#E76F51]/40 hover:shadow-sm'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      <div 
        {...attributes} 
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#1F2933] p-1 -ml-1 rounded-md hover:bg-[#F3F4F6] transition-colors"
      >
        <GripVertical size={16} />
      </div>
      
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[#1F2933] text-sm truncate pr-2">{cat.name}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
            cat.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {cat.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        {cat.description && (
          <p className="text-xs text-[#6B7280] mt-1 line-clamp-1">{cat.description}</p>
        )}
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="text-[#9CA3AF] hover:text-[#E76F51] p-1.5 -mr-1 mt-0.5 rounded-md hover:bg-[#FDF0EC] transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Editar categoría"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

/* ─── CategoryModal ──────────────────────────────────────────────── */
function CategoryModal({
  category,
  restaurantId,
  branchId,
  onClose,
  onSaved,
  onManageSubsections
}: {
  category: Category | null;
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
  onManageSubsections?: (cat: Category) => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [backgroundColor, setBackgroundColor] = useState(category?.background_color || '#FFFFFF');
  const [pageBackgroundColor, setPageBackgroundColor] = useState(category?.page_background_color || '#F9FAFB');
  const [pageTextColor, setPageTextColor] = useState(category?.page_text_color || '#1F2933');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }

    setSaving(true);
    setError('');

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      sort_order: sortOrder,
      restaurant_id: restaurantId,
      branch_id: branchId,
      is_active: true,
      background_color: backgroundColor,
      page_background_color: pageBackgroundColor,
      page_text_color: pageTextColor,
    };

    if (category) {
      const { error: err } = await supabase.from('categories').update(payload).eq('id', category.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('categories').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!category) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Se perderán los productos asociados si no los reasignas.`)) return;
    
    setSaving(true);
    setError('');
    
    const { error: err } = await supabase.from('categories').delete().eq('id', category.id);
    if (err) {
      setError(err.message || 'No se pudo eliminar la categoría (podría tener productos asociados)');
      setSaving(false);
    } else {
      setSaving(false);
      onClose();
      if (onManageSubsections) onManageSubsections(category);
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#1F2933]">
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <div className="flex items-center gap-4">
            {category && onManageSubsections && (
              <button 
                onClick={() => onManageSubsections(category)}
                className="text-sm font-medium text-[#E76F51] hover:underline"
              >
                Gestionar Subsecciones
              </button>
            )}
            <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2933] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="category-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Ej: Bebidas, Postres..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors resize-none"
              placeholder="Descripción opcional..."
            />
          </div>



          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          </form>
        </div>

        <div className="p-6 pt-4 border-t border-[#E5E7EB] flex gap-3">
          {category && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-50 text-red-600 rounded-xl px-4 py-3 font-medium hover:bg-red-100 transition-colors shrink-0"
              title="Eliminar categoría"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-4 py-3 font-medium hover:bg-[#F9FAFB] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={saving}
            className="flex-1 bg-[#E76F51] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#D4604A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Guardando...' : (
              <>
                <Check size={16} />
                {category ? 'Guardar' : 'Crear'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ProductModal ───────────────────────────────────────────────── */
function ProductModal({
  product,
  categories,
  stations,
  restaurantId,
  branchId,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  stations: KitchenStation[];
  restaurantId: string;
  branchId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'recipe'>('details');
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.id || '');
  const [stationId, setStationId] = useState(product?.station_id || '');
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);
  
  const [subsectionId, setSubsectionId] = useState(product?.subsection_id || '');
  const [cardBackgroundColor, setCardBackgroundColor] = useState(product?.card_background_color || '#FFFFFF');
  const [cardTextColor, setCardTextColor] = useState(product?.card_text_color || '#1F2933');
  const [subsections, setSubsections] = useState<any[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (categoryId) {
      supabase.from('subsections').select('*').eq('category_id', categoryId).order('sort_order').then(({data}) => {
        if(data) setSubsections(data);
      });
    } else {
      setSubsections([]);
    }
  }, [categoryId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!price || parseFloat(price) <= 0) { setError('El precio debe ser mayor a 0'); return; }
    if (!categoryId) { setError('Selecciona una categoría'); return; }

    setSaving(true);
    setError('');

    let finalImageUrl = product?.image_url || null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${restaurantId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('products').upload(filePath, imageFile);
      
      if (uploadError) {
        setError('Error al subir la imagen: ' + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath);
      finalImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      category_id: categoryId,
      subsection_id: subsectionId || null,
      station_id: stationId || null,
      card_background_color: cardBackgroundColor,
      card_text_color: cardTextColor,
      is_available: isAvailable,
      image_url: finalImageUrl,
      restaurant_id: restaurantId,
      branch_id: branchId,
      is_active: true,
    };

    if (product) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', product.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('products').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"?`)) return;
    
    setSaving(true);
    setError('');
    
    const { error: err } = await supabase.from('products').delete().eq('id', product.id);
    if (err) {
      setError(err.message || 'No se pudo eliminar el producto');
      setSaving(false);
    } else {
      setSaving(false);
      onClose();
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {showCropper && rawImageSrc && (
        <ImageCropperModal
          imageSrc={rawImageSrc}
          aspect={1}
          recommendedSize="800x800 px"
          onCancel={() => {
            setShowCropper(false);
            setRawImageSrc(null);
          }}
          onCropComplete={async (croppedBlob) => {
            const file = new File([croppedBlob], 'product_cropped.jpg', { type: 'image/jpeg' });
            const compressed = await compressImage(file, 800, 0.8);
            setImageFile(compressed);
            setImagePreview(URL.createObjectURL(compressed));
            setShowCropper(false);
            setRawImageSrc(null);
          }}
        />
      )}

      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <h2 className="text-xl font-bold text-[#1F2933]">
            {product ? product.name : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2933] transition-colors mb-4">
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex px-6 border-b border-gray-200 gap-6 mt-4 shrink-0">
          <button 
            type="button"
            className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'details' ? 'border-[#E76F51] text-[#E76F51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('details')}
          >
            Detalles
          </button>
          <button 
            type="button"
            disabled={!product}
            className={`pb-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'recipe' ? 'border-[#E76F51] text-[#E76F51]' : 'border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
            onClick={() => {
              if (product) setActiveTab('recipe');
            }}
          >
            Receta {(!product) && '(Guarda para añadir)'}
          </button>
        </div>

        {activeTab === 'details' ? (
        <>
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4" id="product-form">
          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder="Ej: Hamburguesa clásica"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Imagen</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-[#D1D5DB]" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-xl text-sm font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors"
                >
                  <Upload size={16} />
                  Subir foto
                </label>
                <p className="text-xs text-[#6B7280] mt-1.5">Tamaño recomendado: Cuadrada (ej. 800x800px)<br/>JPG, PNG o WEBP. Máx. 2MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors resize-none"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Precio *</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                placeholder="0"
                min="0"
                step="any"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Categoría *</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Subsección</label>
              <select
                value={subsectionId}
                onChange={e => setSubsectionId(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
              >
                <option value="">(Ninguna)</option>
                {subsections.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Estación de Preparación</label>
              <select
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
              >
                <option value="">(Sin estación)</option>
                {(stations || []).map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* availability toggle */}
          <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <div>
              <p className="text-sm font-medium text-[#1F2933]">Disponibilidad</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {isAvailable ? 'El producto está visible en el menú' : 'El producto está oculto'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-14 h-7 rounded-full transition-colors relative ${
                isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                isAvailable ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          </form>
        </div>

        <div className="p-6 border-t border-[#E5E7EB] shrink-0 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            {product && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-50 text-red-600 rounded-xl px-4 py-3 font-medium hover:bg-red-100 transition-colors shrink-0"
                title="Eliminar producto"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-4 py-3 font-medium hover:bg-[#F9FAFB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="flex-1 bg-[#E76F51] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#D4604A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Guardando...' : (
                <>
                  <Check size={16} />
                  {product ? 'Guardar' : 'Crear'}
                </>
              )}
            </button>
          </div>
        </div>
        </>
        ) : activeTab === 'recipe' && product ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 rounded-b-2xl">
            <ProductRecipeTab product={product} restaurantId={restaurantId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
