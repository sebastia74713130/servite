import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Product, Category, Subsection } from '@shared/types';
import { SortableProductCard } from './SortableProductCard';
import { Package, Sparkles, Plus, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';

interface ProductGridAreaProps {
  categories: Category[];
  selectedCatId: string | undefined;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  prodLoading: boolean;
  subsections: Subsection[];
  setSubsections: React.Dispatch<React.SetStateAction<Subsection[]>>;
  openEditProduct: (p: Product) => void;
  handleToggleAvailability: (p: Product) => void;
  setShowScanModal: (v: boolean) => void;
  setEditingProduct: (p: Product | null) => void;
  setShowProdModal: (v: boolean) => void;
  refetchSubsections: () => void;
  refetchProds: () => void;
}

function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Container',
    },
  });

  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-[#E76F51] bg-[#FDF0EC]/50' : ''} transition-all`}>
      {children}
    </div>
  );
}

export function ProductGridArea({
  categories,
  selectedCatId,
  products,
  setProducts,
  prodLoading,
  subsections,
  setSubsections,
  openEditProduct,
  handleToggleAvailability,
  setShowScanModal,
  setEditingProduct,
  setShowProdModal,
  refetchSubsections,
  refetchProds,
}: ProductGridAreaProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddingSubsection, setIsAddingSubsection] = useState(false);
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null);
  const [editingSubsectionName, setEditingSubsectionName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedCategory = categories.find(c => c.id === selectedCatId);

  const containers = ['root', ...subsections.map(s => s.id)];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveProduct = active.data.current?.type === 'Product';
    const isOverContainer = containers.includes(overId as string);

    if (!isActiveProduct) return;

    const activeProduct = products.find(p => p.id === activeId);
    const overProduct = products.find(p => p.id === overId);

    if (!activeProduct) return;

    const activeContainer = activeProduct.subsection_id || 'root';
    const overContainer = isOverContainer 
      ? overId 
      : overProduct?.subsection_id || 'root';

    if (activeContainer !== overContainer) {
      setProducts(prev => {
        const activeItems = prev.filter(p => (p.subsection_id || 'root') === activeContainer);
        const overItems = prev.filter(p => (p.subsection_id || 'root') === overContainer);

        const overIndex = isOverContainer 
          ? overItems.length 
          : overItems.findIndex(p => p.id === overId);

        const newProducts = [...prev];
        const productIndex = newProducts.findIndex(p => p.id === activeId);
        
        newProducts[productIndex] = {
          ...newProducts[productIndex],
          subsection_id: overContainer === 'root' ? null : (overContainer as string)
        };

        return newProducts;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      refetchProds();
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const activeProduct = products.find(p => p.id === activeId);
    if (!activeProduct) return;

    const activeContainer = activeProduct.subsection_id || 'root';
    const containerProducts = products.filter(p => (p.subsection_id || 'root') === activeContainer);
    
    const oldIndex = containerProducts.findIndex(p => p.id === activeId);
    let newIndex = oldIndex;

    const overProduct = products.find(p => p.id === overId);
    if (overProduct && (overProduct.subsection_id || 'root') === activeContainer) {
        newIndex = containerProducts.findIndex(p => p.id === overId);
    } else if (containers.includes(overId as string) && overId === activeContainer) {
        newIndex = containerProducts.length - 1;
    }

    if (oldIndex !== newIndex) {
        setProducts(prev => {
            const newProducts = [...prev];
            const containerItems = newProducts.filter(p => (p.subsection_id || 'root') === activeContainer);
            const otherItems = newProducts.filter(p => (p.subsection_id || 'root') !== activeContainer);
            
            const reorderedContainerItems = arrayMove(containerItems, oldIndex, newIndex);
            
            reorderedContainerItems.forEach((item, index) => {
                item.sort_order = index;
            });
            
            return [...otherItems, ...reorderedContainerItems];
        });

        const reordered = arrayMove(containerProducts, oldIndex, newIndex);
        Promise.all(reordered.map((p, index) => 
            supabase.from('products').update({ sort_order: index, subsection_id: activeContainer === 'root' ? null : activeContainer }).eq('id', p.id)
        )).then(() => refetchProds());
    } else {
        const currentContainerProducts = products.filter(p => (p.subsection_id || 'root') === activeContainer);
        Promise.all(currentContainerProducts.map((p, index) => 
            supabase.from('products').update({ sort_order: index, subsection_id: activeContainer === 'root' ? null : activeContainer }).eq('id', p.id)
        )).then(() => refetchProds());
    }
  };

  const handleAddSubsection = async () => {
    if (!newSubsectionName.trim() || !selectedCatId) return;
    const payload = {
      category_id: selectedCatId,
      name: newSubsectionName.trim(),
      sort_order: subsections.length,
    };
    const { error } = await supabase.from('subsections').insert(payload);
    if (!error) {
      setNewSubsectionName('');
      setIsAddingSubsection(false);
      refetchSubsections();
    }
  };

  const handleEditSubsection = async (subId: string) => {
    if (!editingSubsectionName.trim()) return;
    await supabase.from('subsections').update({ name: editingSubsectionName.trim() }).eq('id', subId);
    setEditingSubsectionId(null);
    refetchSubsections();
  };

  const handleDeleteSubsection = async (subId: string) => {
    if (!confirm('¿Eliminar esta subsección? Los productos volverán a "Sin subsección" (arriba).')) return;
    await supabase.from('subsections').delete().eq('id', subId);
    refetchSubsections();
    refetchProds();
  };

  const moveSubsection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === subsections.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSubsections = arrayMove(subsections, index, newIndex);
    
    setSubsections(newSubsections);

    Promise.all(newSubsections.map((sub, i) => 
      supabase.from('subsections').update({ sort_order: i }).eq('id', sub.id)
    )).then(() => refetchSubsections());
  };

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#1F2933] flex items-center gap-2">
            <Package size={22} className="text-[#2F4F3E]" />
            {selectedCategory?.name || 'Menú'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-4 py-2.5 font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Sparkles size={18} />
            <span className="hidden sm:inline">Escanear con IA</span>
          </button>
          <button
            onClick={() => { setEditingProduct(null); setShowProdModal(true); }}
            className="flex items-center gap-2 bg-[#E76F51] text-white rounded-xl px-5 py-2.5 font-medium hover:bg-[#D4604A] transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo producto</span>
          </button>
        </div>
      </div>

      {prodLoading ? (
        <LoadingState message="Cargando productos..." />
      ) : products.length === 0 && subsections.length === 0 ? (
        <div className="flex-1 bg-white border border-[#E5E7EB] rounded-2xl flex flex-col items-center justify-center text-[#6B7280]">
          <Package size={48} className="mb-4 opacity-30" />
          <p className="font-medium">No hay productos ni subsecciones</p>
          <p className="text-sm mt-1">Agrega productos o crea una subsección para empezar</p>
          <button onClick={() => setIsAddingSubsection(true)} className="mt-4 text-[#E76F51] font-medium hover:underline">
            + Añadir subsección
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-8">
              {/* Root Container */}
              <DroppableContainer id="root" className="min-h-[10px]">
                <SortableContext id="root" items={products.filter(p => !p.subsection_id).map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {products.filter(p => !p.subsection_id).sort((a,b) => a.sort_order - b.sort_order).map(prod => (
                      <SortableProductCard 
                        key={prod.id} 
                        product={prod} 
                        onEdit={openEditProduct} 
                        onToggleAvailability={handleToggleAvailability} 
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableContainer>

              {/* Subsection Containers */}
              {subsections.sort((a,b) => a.sort_order - b.sort_order).map((sub, index) => {
                const subProducts = products.filter(p => p.subsection_id === sub.id).sort((a,b) => a.sort_order - b.sort_order);
                
                return (
                  <DroppableContainer key={sub.id} id={sub.id}>
                    <SortableContext id={sub.id} items={subProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                      <div className="bg-[#FDF0EC]/30 border border-[#E76F51]/20 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E76F51]/20 group">
                          {editingSubsectionId === sub.id ? (
                            <div className="flex items-center gap-2 flex-1 max-w-sm">
                              <input 
                                type="text" 
                                value={editingSubsectionName}
                                onChange={e => setEditingSubsectionName(e.target.value)}
                                className="border border-[#E76F51] rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleEditSubsection(sub.id)}
                              />
                              <button onClick={() => handleEditSubsection(sub.id)} className="text-green-600 font-medium text-sm">Guardar</button>
                              <button onClick={() => setEditingSubsectionId(null)} className="text-gray-500 font-medium text-sm">Cancelar</button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-bold text-[#E76F51] flex items-center gap-3">
                              {sub.name}
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button onClick={() => { setEditingSubsectionId(sub.id); setEditingSubsectionName(sub.name); }} className="p-1 hover:bg-[#E76F51]/10 rounded text-[#E76F51]" title="Editar nombre">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteSubsection(sub.id)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Eliminar subsección">
                                  <Trash2 size={14} />
                                </button>
                              </span>
                            </h3>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveSubsection(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                              <ChevronUp size={18} />
                            </button>
                            <button onClick={() => moveSubsection(index, 'down')} disabled={index === subsections.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                              <ChevronDown size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="min-h-[80px]">
                          {subProducts.length === 0 ? (
                             <div className="h-full flex items-center justify-center border-2 border-dashed border-[#E76F51]/30 rounded-xl py-6 pointer-events-none">
                                <p className="text-sm text-gray-400">Arrastra productos aquí</p>
                             </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {subProducts.map(prod => (
                                <SortableProductCard 
                                  key={prod.id} 
                                  product={prod} 
                                  onEdit={openEditProduct} 
                                  onToggleAvailability={handleToggleAvailability} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </SortableContext>
                  </DroppableContainer>
                );
              })}

              {/* Add Subsection Inline */}
              <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
                {isAddingSubsection ? (
                  <div className="flex items-center gap-3 max-w-md bg-white p-3 rounded-xl border border-[#E76F51] shadow-sm">
                    <input
                      type="text"
                      placeholder="Nombre de la nueva subsección..."
                      value={newSubsectionName}
                      onChange={e => setNewSubsectionName(e.target.value)}
                      className="flex-1 outline-none text-[#1F2933] text-sm"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleAddSubsection()}
                    />
                    <button onClick={handleAddSubsection} className="text-sm font-medium bg-[#E76F51] text-white px-3 py-1.5 rounded-lg">Crear</button>
                    <button onClick={() => { setIsAddingSubsection(false); setNewSubsectionName(''); }} className="text-sm font-medium text-gray-500 hover:text-gray-700">Cancelar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingSubsection(true)}
                    className="flex items-center gap-2 text-[#E76F51] font-medium hover:bg-[#FDF0EC] px-4 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={18} />
                    Añadir una subsección
                  </button>
                )}
              </div>
            </div>
          </DndContext>
        </div>
      )}
    </main>
  );
}
