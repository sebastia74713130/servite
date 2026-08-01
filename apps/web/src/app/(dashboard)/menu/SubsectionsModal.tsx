'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Category, Subsection } from '@shared/types';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, GripVertical, Image as ImageIcon, Upload } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';
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

/* ─── Sortable Subsection Item ───────────────────────────────────────── */
function SortableSubsectionItem({ sub, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-4 bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-900">
          <GripVertical size={16} />
        </div>
        {sub.image_url ? (
          <img src={sub.image_url} alt="" className="w-16 h-8 object-cover rounded" />
        ) : (
          <div 
            className="px-3 py-1 rounded text-sm font-bold border border-black/5" 
            style={{ backgroundColor: sub.background_color || '#F9FAFB', color: sub.text_color || '#1F2933', fontFamily: sub.typography === 'serif' ? 'serif' : sub.typography === 'mono' ? 'monospace' : 'sans-serif' }}
          >
            {sub.name}
          </div>
        )}
        <span className="font-medium text-gray-900">{sub.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(sub)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
          <Edit2 size={16} />
        </button>
        <button onClick={() => onDelete(sub.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export function SubsectionsModal({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#F9FAFB');
  const [textColor, setTextColor] = useState('#1F2933');
  const [typography, setTypography] = useState('sans');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setSubsections((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order locally
        const reordered = newArray.map((item, index) => ({ ...item, sort_order: index }));
        
        // Save to DB in background
        Promise.all(reordered.map(sub => 
          supabase.from('subsections').update({ sort_order: sub.sort_order }).eq('id', sub.id)
        ));
        
        return reordered;
      });
    }
  };

  useEffect(() => {
    fetchSubsections();
  }, [category.id]);

  const fetchSubsections = async () => {
    const { data, error } = await supabase
      .from('subsections')
      .select('*')
      .eq('category_id', category.id)
      .order('sort_order', { ascending: true });
    
    if (data) setSubsections(data as Subsection[]);
    setLoading(false);
  };

  const handleStartEdit = (sub?: Subsection) => {
    if (sub) {
      setEditingId(sub.id);
      setName(sub.name);
      setBackgroundColor(sub.background_color || '#F9FAFB');
      setTextColor(sub.text_color || '#1F2933');
      setTypography(sub.typography || 'sans');
      setImagePreview(sub.image_url || '');
    } else {
      setEditingId('new');
      setName('');
      setBackgroundColor('#F9FAFB');
      setTextColor('#1F2933');
      setTypography('sans');
      setImagePreview('');
    }
    setImageFile(null);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setImageFile(null);
    setError('');
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    setError('');

    let finalImageUrl = imagePreview || null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `sub_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `categories/${category.restaurant_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('branding').upload(filePath, imageFile);
      if (uploadError) {
        setError('Error al subir la imagen: ' + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(filePath);
      finalImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      category_id: category.id,
      name: name.trim(),
      sort_order: subsections.length, // simple append for now
    };

    if (editingId === 'new') {
      const { error } = await supabase.from('subsections').insert(payload);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('subsections').update(payload).eq('id', editingId);
      if (error) setError(error.message);
    }

    if (!error) {
      handleCancelEdit();
      fetchSubsections();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta subsección? Los productos volverán a la categoría principal.')) return;
    await supabase.from('subsections').delete().eq('id', id);
    fetchSubsections();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-bold text-[#1F2933]">
            Subsecciones de: {category.name}
          </h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1F2933] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : (
            <div className="space-y-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={subsections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {subsections.map(sub => (
                    <SortableSubsectionItem 
                      key={sub.id} 
                      sub={sub} 
                      onEdit={handleStartEdit} 
                      onDelete={handleDelete} 
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {!editingId && (
                <button
                  onClick={() => handleStartEdit()}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-[#E76F51] hover:text-[#E76F51] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Añadir Subsección
                </button>
              )}

              {editingId && (
                <div className="border border-[#E76F51] rounded-xl p-5 bg-[#FDF0EC]/30 mt-6 space-y-4">
                  <h3 className="font-bold text-[#1F2933]">{editingId === 'new' ? 'Nueva Subsección' : 'Editar Subsección'}</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre del Título / Separador</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E76F51]"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="flex gap-2 pt-2">
                    <button onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#E76F51] text-white rounded-lg text-sm font-medium hover:bg-[#D4604A]">
                      {saving ? 'Guardando...' : 'Guardar Subsección'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
