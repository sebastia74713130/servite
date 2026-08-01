'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, FileText, LayoutGrid, ChevronLeft, Search, Maximize, Minimize } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { Product } from '@shared/types';

type CartItem = {
  id: string; // unique local ID
  product: Product;
  quantity: number;
  notes: string;
};

export default function PublicMenuClient({
  table,
  restaurant,
  categories,
  products,
  subsections = [],
  isPreviewMode = false,
  onCategoryChange,
  externalSelectedCatId
}: {
  table: any;
  restaurant: any;
  categories: any[];
  products: any[];
  subsections?: any[];
  isPreviewMode?: boolean;
  onCategoryChange?: (categoryId: string | null) => void;
  externalSelectedCatId?: string | null;
}) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    if (externalSelectedCatId !== undefined) {
      setSelectedCatId(externalSelectedCatId);
    }
  }, [externalSelectedCatId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEnded = sessionStorage.getItem(`session_ended_${table.id}`) === 'true';
      if (isEnded) {
        setSessionEnded(true);
      } else if (sessionStorage.getItem(`has_ordered_${table.id}`) === 'true') {
        const checkUnpaid = async () => {
          try {
            const { data, error } = await supabase
              .from('orders')
              .select('id')
              .eq('table_id', table.id)
              .eq('is_paid', false)
              .neq('status', 'cancelled');
            
            if (!error && data && data.length === 0) {
              setSessionEnded(true);
              sessionStorage.setItem(`session_ended_${table.id}`, 'true');
            }
          } catch (e) {}
        };
        checkUnpaid();
      }
    }
  }, [table.id]);


  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [billOrders, setBillOrders] = useState<any[]>([]);
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [serviceRequestLoading, setServiceRequestLoading] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const cat = params.get('cat');
      if (tab === 'cart') {
        setShowCart(true);
        setShowBill(false);
      }
      else if (tab === 'bill') {
        setShowBill(true);
        setShowCart(false);
      }
      if (cat) setSelectedCatId(cat);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isPreviewMode) {
      const url = new URL(window.location.href);
      if (showCart) url.searchParams.set('tab', 'cart');
      else if (showBill) url.searchParams.set('tab', 'bill');
      else url.searchParams.delete('tab');
      
      if (selectedCatId) url.searchParams.set('cat', selectedCatId);
      else url.searchParams.delete('cat');

      window.history.replaceState({}, '', url);
    }
  }, [showCart, showBill, selectedCatId, isPreviewMode]);

  // Form state for selected product
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFull);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;
    
    const reqFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    
    const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

    if (!isFull) {
      if (reqFS) {
        try {
          const promise = reqFS.call(docEl);
          if (promise) {
            promise.catch((err: any) => {}); // Silently ignore errors
          }
        } catch (e) {
        }
      }
    } else {
      if (exitFS) {
        exitFS.call(doc);
      }
    }
  };

  const [hasAttemptedAutoFS, setHasAttemptedAutoFS] = useState(false);
  
  const handleFirstInteraction = () => {
    if (hasAttemptedAutoFS) return;
    setHasAttemptedAutoFS(true);
    
    const docEl = document.documentElement as any;
    const doc = document as any;
    const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
    
    if (!isFull) {
      const reqFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (reqFS) {
        try {
          const promise = reqFS.call(docEl);
          if (promise) {
            promise.catch(() => {});
          }
        } catch (e) {}
      }
    }
  };

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${table.table_code}`);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, [table.table_code]);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(`cart_${table.table_code}`, JSON.stringify(cartItems));
  }, [cartItems, table.table_code]);

  const brandColor = restaurant?.brand_color || '#E76F51';
  
  const isLight = (color: string) => {
    if (!color) return true;
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 200; // 200 is a good threshold for very light backgrounds
  };
  
  const isLightBrand = isLight(brandColor);
  
  const globalRawBg = restaurant?.menu_background_color || '#F9FAFB';
  const isLightPageBg = isLight(globalRawBg.split('|')[0]);
  const showShadows = !globalRawBg.includes('|noshadow');
  const globalBgColor = globalRawBg.replace('|noshadow', '');
  
  const selectedCategoryData = categories.find(c => c.id === selectedCatId);
  const bgColor = selectedCategoryData?.page_background_color || globalBgColor;
  const pageTextColor = selectedCategoryData?.page_text_color || restaurant?.menu_text_color || '#1F2933';
  const coverUrl = selectedCategoryData?.cover_url || restaurant?.cover_url;
  const bgImageUrl = restaurant?.menu_background_image_url;

  const filteredProducts = (selectedCatId 
    ? products.filter(p => p.category_id === selectedCatId)
    : products
  ).filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  const cartTotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleOpenProduct = (prod: any) => {
    setSelectedProduct(prod);
    setQuantity(1);
    setNotes('');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const newItem: CartItem = {
      id: Math.random().toString(36).substring(7),
      product: selectedProduct,
      quantity,
      notes
    };
    setCartItems([...cartItems, newItem]);
    setSelectedProduct(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    
    try {
      // Group cart items by station
      const itemsByStation = cartItems.reduce((acc, item) => {
        const stationId = item.product.station_id || 'unassigned';
        if (!acc[stationId]) acc[stationId] = [];
        acc[stationId].push(item);
        return acc;
      }, {} as Record<string, typeof cartItems>);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all 'sent' orders for this table today to see if we can merge
      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, subtotal, total, order_items(station_id)')
        .eq('table_id', table.id)
        .eq('status', 'sent')
        .eq('is_paid', false)
        .gte('created_at', today.toISOString());

      // We need to process each station group separately
      for (const [stationId, items] of Object.entries(itemsByStation)) {
        const groupTotal = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
        const actualStationId = stationId === 'unassigned' ? null : stationId;
        
        // Find if there is an existing 'sent' order for this specific station
        let targetOrderId = null;
        if (existingOrders) {
          const matchingOrder = existingOrders.find(o => {
            // Check if this order has items that match our station
            // Handle null (unassigned) and actual UUIDs
            return o.order_items?.some(oi => oi.station_id === actualStationId);
          });
          
          if (matchingOrder) {
            targetOrderId = matchingOrder.id;
            
            // Update the total of the existing order
            await supabase
              .from('orders')
              .update({
                subtotal: matchingOrder.subtotal + groupTotal,
                total: matchingOrder.total + groupTotal,
                updated_at: new Date().toISOString()
              })
              .eq('id', targetOrderId);
              
            // Update local reference so if we merge again it's accurate
            matchingOrder.subtotal += groupTotal;
            matchingOrder.total += groupTotal;
          }
        }

        if (!targetOrderId) {
          // Create new order for this station
          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
              restaurant_id: restaurant.id,
              branch_id: table.branch_id,
              table_id: table.id,
              table_number: table.table_number,
              status: 'sent',
              subtotal: groupTotal,
              total: groupTotal,
              customer_session_id: 'web-session-' + Math.random().toString(36).substring(7),
            })
            .select()
            .single();

          if (orderError) throw orderError;
          targetOrderId = newOrder.id;
        }

        // Create order items for this group
        const itemsToInsert = items.map(item => ({
          order_id: targetOrderId,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          notes: item.notes || null,
          station_id: actualStationId,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
        
        // Trigger a realtime update by modifying the order AFTER items are inserted
        // This ensures the Kitchen and Orders dashboard fetch the order with its items
        await supabase
          .from('orders')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', targetOrderId);
      }

      // Success
      sessionStorage.setItem(`has_ordered_${table.id}`, 'true');
      setCartItems([]);
      setShowCart(false);
      setServiceMessage("¡Pedido enviado a la cocina con éxito!");

    } catch (err: any) {
      alert("Error al enviar el pedido: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchBill = async (isRefresh = false) => {
    setIsFetchingBill(true);
    if (!isRefresh) {
      setShowBill(true);
      setShowCart(false);
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', table.id)
        .eq('is_paid', false)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      if (isRefresh && billOrders.length > 0 && (!data || data.length === 0)) {
        // Tenía pedidos sin pagar, y ahora no tiene. Significa que pagaron la cuenta.
        setSessionEnded(true);
        sessionStorage.setItem(`session_ended_${table.id}`, 'true');
      }

      setBillOrders(data || []);
    } catch (err: any) {
      console.error(err);
      alert("Error al cargar la cuenta");
    } finally {
      setIsFetchingBill(false);
    }
  };

  const handleServiceRequest = async (status: 'calling_waiter' | 'requesting_bill') => {
    setServiceRequestLoading(true);
    try {
      const { error } = await supabase
        .from('tables')
        .update({ 
          service_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', table.id);
      if (error) throw error;
      setServiceMessage(status === 'calling_waiter' ? "¡Mesero llamado! Enseguida te atenderán." : "¡Cuenta solicitada! Enseguida te la llevarán.");
      if (status === 'requesting_bill') setShowBill(false);
    } catch (err: any) {
      alert("Error al solicitar el servicio");
    } finally {
      setServiceRequestLoading(false);
    }
  };

  const totalBill = billOrders.reduce((acc, o) => acc + o.total, 0);

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        {restaurant?.logo_url ? (
          <img src={restaurant.logo_url} alt="Logo" className="w-32 h-32 object-contain mb-6 drop-shadow-md" />
        ) : (
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">👋</span>
          </div>
        )}
        <h2 className="text-3xl font-bold text-gray-900 mb-3">¡Gracias por venir!</h2>
        <p className="text-gray-500 text-lg max-w-sm">Esperamos que hayas disfrutado tu experiencia en {restaurant?.name || 'nuestro restaurante'}. ¡Vuelve pronto!</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative flex flex-col" 
      style={{ backgroundColor: bgColor }}
      onClick={handleFirstInteraction}
    >
      {/* Background Image Layer */}
      {bgImageUrl && (
        <div 
          className="fixed inset-0 z-0 pointer-events-none"
          style={{ 
            backgroundImage: `url(${bgImageUrl})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            opacity: 1
          }}
        />
      )}
      
      {/* Main Content (needs relative z-10 to sit above fixed background) */}
      <div className="relative z-10 flex-1 pb-4">
        {/* ── Cover ── */}
        {coverUrl && (
          <div className="w-full aspect-[21/9] bg-gray-200 relative">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        )}

        <div 
          className={`w-full relative z-20 ${coverUrl ? '-mt-8 rounded-t-[2.5rem] shadow-[0_-8px_30px_rgba(0,0,0,0.1)]' : ''}`}
          style={coverUrl ? { 
            backgroundColor: bgColor,
            backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          } : {}}
        >

          {/* ── Home Header ── */}
          {!selectedCatId ? (
            <div className={`px-6 pb-4 flex items-start relative z-10 ${coverUrl ? 'pt-8' : 'pt-8'}`}>
              <div className="flex-1">
                {restaurant?.logo_url ? (
                  <div className={`w-28 h-28 rounded-2xl bg-white p-2 border border-gray-100 flex items-center justify-center mb-3 ${coverUrl ? `-mt-12 ${showShadows ? 'shadow-md' : ''} relative z-30` : `mt-2 ${showShadows ? 'shadow-sm' : ''}`}`}>
                    <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold" style={{ color: pageTextColor }}>
                    {restaurant?.name}
                  </h1>
                )}
                <p className="text-sm font-medium opacity-70 mt-1" style={{ color: pageTextColor }}>
                  {table.table_number}
                </p>
              </div>
            </div>
          ) : (
            <div className={`w-full ${coverUrl ? 'h-8' : 'h-2'}`}></div>
          )}

      {/* ── Sticky Navigation (Search + Categories) ── */}
      <div className={`sticky top-0 z-40 ${isLightPageBg ? 'bg-white/70 border-black/5' : 'bg-black/50 border-white/10'} backdrop-blur-md animate-fade-in-up border-b flex flex-col`} style={{ animationDelay: '0.1s' }}>
        
        {/* Search Bar or Category Title */}
        <div className={`flex items-center gap-3 px-4 h-14 border-b ${isLightPageBg ? 'border-black/5' : 'border-white/5'}`}>
          {selectedCatId ? (
            <>
              <button 
                onClick={() => { setSelectedCatId(null); onCategoryChange?.(null); setSearchQuery(''); }}
                className={`w-9 h-9 rounded-full ${isLightPageBg ? 'bg-gray-100/80 text-gray-700' : 'bg-white/10 text-white'} flex items-center justify-center active:scale-90 transition-transform flex-shrink-0`}
              >
                <ChevronLeft size={22} />
              </button>
              <h2 className={`text-[16px] font-bold ${isLightPageBg ? 'text-gray-900' : 'text-white'} truncate flex-1 tracking-wide uppercase`}>{selectedCategoryData?.name}</h2>
            </>
          ) : (
            <div className="flex-1 relative">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLightPageBg ? 'text-gray-400' : 'text-gray-500'} pointer-events-none`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar platos..."
                className={`w-full h-9 pl-9 pr-3 rounded-full ${isLightPageBg ? 'bg-white text-gray-900 placeholder:text-gray-400' : 'bg-white/10 text-white placeholder:text-gray-400'} outline-none focus:ring-2 focus:ring-offset-0 transition-shadow shadow-sm`}
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isLightPageBg ? 'text-gray-400' : 'text-gray-300'}`}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className={`w-9 h-9 rounded-full ${isLightPageBg ? 'bg-gray-100/80 text-gray-700' : 'bg-white/10 text-white'} flex items-center justify-center active:scale-90 transition-transform flex-shrink-0`}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-6 overflow-x-auto whitespace-nowrap py-3 flex gap-3 items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => { 
            setSelectedCatId(null); 
            onCategoryChange?.(null); 
          }}
          className={`h-10 px-5 rounded-full text-[15px] font-bold transition-all ${!selectedCatId && showShadows ? 'shadow-sm' : ''} flex items-center justify-center flex-shrink-0 whitespace-nowrap`}
          style={!selectedCatId ? { backgroundColor: brandColor, color: isLightBrand ? '#1F2933' : '#FFF' } : { backgroundColor: 'transparent', color: isLightPageBg ? '#6B7280' : '#9CA3AF' }}
        >
          Todos
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          const hasImage = !!cat.image_url;
          const catBg = cat.background_color && cat.background_color !== '#FFFFFF' ? cat.background_color : brandColor;
          
          const isLightBg = isLight(catBg);
          const defaultCatText = isLightBg ? '#1F2933' : '#FFF';
          const catText = cat.text_color ? (isLight(cat.text_color) && isLightBg ? '#1F2933' : cat.text_color) : defaultCatText;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id);
                onCategoryChange?.(cat.id);
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`h-10 px-5 rounded-full text-[15px] font-bold transition-all ${isSelected && showShadows ? 'shadow-sm' : ''} flex items-center justify-center gap-2 flex-shrink-0 whitespace-nowrap`}
              style={isSelected ? { backgroundColor: catBg, color: catText } : { backgroundColor: 'transparent', color: isLightPageBg ? '#6B7280' : '#9CA3AF' }}
            >
              {hasImage && (
                <img src={cat.image_url} alt="" className="w-7 h-7 rounded-full object-cover shadow-sm flex-shrink-0" />
              )}
              {cat.name}
            </button>
          );
        })}
      </div>
      </div>

      {/* Products Display */}
      <div className="px-6 mt-6 pb-32 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {(() => {
          const renderProductCard = (prod: any, layout: 'grid' | 'list' = 'grid') => {
            const cBg = prod.card_background_color || '#FFFFFF';
            const cText = prod.card_text_color || '#1F2933';
            
            if (layout === 'grid') {
              return (
                <div 
                  key={prod.id} 
                  onClick={isPreviewMode ? undefined : () => handleOpenProduct(prod)}
                  role="button"
                  tabIndex={0}
                  className={`w-[140px] md:w-[160px] flex-shrink-0 flex flex-col text-left transition-all duration-300 hover:-translate-y-1 ${isPreviewMode ? 'cursor-default' : 'active:scale-[0.98] cursor-pointer'}`}
                >
                  <div className={`w-full aspect-square rounded-2xl relative flex-shrink-0 ${showShadows ? 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]' : ''} overflow-hidden group bg-gray-50`}>
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 ease-out" />
                    ) : (
                      <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center p-2 border border-black/5">
                        <span className="text-3xl mb-1 opacity-80">🍽️</span>
                      </div>
                    )}
                    
                    {/* Add button floating on image */}
                    <div 
                      className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${showShadows ? 'shadow-md' : ''} flex-shrink-0 z-10`} 
                      style={prod.is_available ? { backgroundColor: brandColor, color: isLightBrand ? '#1F2933' : '#FFF', border: isLightBrand ? '1px solid #E5E7EB' : 'none' } : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
                    >
                      <Plus size={18} />
                    </div>
                    
                    {!prod.is_available && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full">Agotado</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 px-1 flex-1 flex flex-col">
                    <h3 className="font-bold text-[14px] leading-tight line-clamp-2" style={{ color: pageTextColor }}>{prod.name}</h3>
                    <p className="font-bold text-[13px] mt-1" style={{ color: pageTextColor }}>
                      Bs {prod.price.toLocaleString('es-BO')}
                    </p>
                  </div>
                </div>
              );
            }
            
            // List Layout
            return (
              <div 
                key={prod.id} 
                onClick={isPreviewMode ? undefined : () => handleOpenProduct(prod)}
                role="button"
                tabIndex={0}
                className={`w-full text-left flex items-stretch gap-4 p-4 rounded-2xl ${showShadows ? 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-black/5' : 'border border-gray-100'} transition-all duration-300 hover:-translate-y-0.5 ${isPreviewMode ? 'cursor-default' : 'active:scale-[0.98] cursor-pointer'} group`}
                style={{ backgroundColor: cBg }}
              >
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-[16px] leading-tight line-clamp-2" style={{ color: cText }}>{prod.name}</h3>
                    {prod.description && (
                      <p className="text-[14px] mt-1.5 line-clamp-2 leading-snug" style={{ color: cText, opacity: 0.65 }}>{prod.description}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-bold text-[15px]" style={{ color: cText }}>
                      Bs {prod.price.toLocaleString('es-BO')}
                    </p>
                    {!prod.image_url && (
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${showShadows ? 'shadow-sm' : ''} z-10 flex-shrink-0`} 
                        style={prod.is_available ? { backgroundColor: brandColor, color: isLightBrand ? '#1F2933' : '#FFF' } : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
                      >
                        <Plus size={18} />
                      </div>
                    )}
                  </div>
                </div>
                {prod.image_url && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl relative flex-shrink-0 bg-gray-50 overflow-hidden">
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    <div 
                      className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${showShadows ? 'shadow-md' : ''} z-10`} 
                      style={prod.is_available ? { backgroundColor: brandColor, color: isLightBrand ? '#1F2933' : '#FFF' } : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }}
                    >
                      <Plus size={18} />
                    </div>
                    {!prod.is_available && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full">Agotado</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          };

          if (!selectedCatId) {
            return (
              <div className="space-y-8 pb-10">
                {categories.map(cat => {
                  const catProducts = filteredProducts.filter(p => p.category_id === cat.id);
                  if (catProducts.length === 0) return null;
                  
                  return (
                    <div key={cat.id} className="flex flex-col">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-xl font-bold" style={{ color: cat.page_text_color || pageTextColor }}>{cat.name}</h2>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {catProducts.map(p => renderProductCard(p, 'grid'))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          const catSubsections = subsections.filter(s => s.category_id === selectedCatId).sort((a, b) => a.sort_order - b.sort_order);
          const validSubIds = new Set(catSubsections.map(s => s.id));
          const productsWithoutSub = filteredProducts.filter(p => !p.subsection_id || !validSubIds.has(p.subsection_id));

          return (
            <div className="space-y-8">
              {productsWithoutSub.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {productsWithoutSub.map(p => renderProductCard(p, 'list'))}
                </div>
              )}
              
              {catSubsections.map(sub => {
                const subProducts = filteredProducts.filter(p => p.subsection_id === sub.id).sort((a, b) => a.sort_order - b.sort_order);
                if (subProducts.length === 0 && !isPreviewMode) return null;
                const typoParts = (sub.typography || 'sans').split(',');
                const fontFamilyName = typoParts[0] === 'serif' ? 'serif' : typoParts[0] === 'mono' ? 'monospace' : 'sans-serif';
                const textAlign = typoParts[1] || 'left';
                const pageBgColor = typoParts[2] && typoParts[2] !== 'transparent' ? typoParts[2] : undefined;
                
                return (
                  <div key={sub.id} className={`space-y-4 ${pageBgColor ? '-mx-6 px-6 pb-6 pt-0 rounded-3xl' : ''} mb-12`} style={pageBgColor ? { backgroundColor: pageBgColor } : {}}>
                    {(sub._pendingImagePreview || sub.image_url) ? (
                      <div className={`h-24 md:h-32 -mx-6 overflow-hidden relative rounded-t-3xl ${showShadows ? 'shadow-sm' : ''}`}>
                        <img src={sub._pendingImagePreview || sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center" style={{ justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }}>
                          <h2 className="text-xl md:text-2xl font-bold drop-shadow-md px-6 w-full" style={{ color: sub.text_color || '#FFFFFF', fontFamily: fontFamilyName, textAlign: textAlign as any }}>{sub.name}</h2>
                        </div>
                      </div>
                    ) : (
                      <div className="relative -mx-6 flex flex-col">
                        <div 
                          className="flex items-center pt-8 pb-3 px-6 relative z-10"
                          style={{
                            justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center'
                          }}
                        >
                          <h2 className="text-xl md:text-2xl font-black w-full tracking-tight" style={{ color: sub.text_color || pageTextColor, fontFamily: fontFamilyName, textAlign: textAlign as any }}>{sub.name}</h2>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                      {subProducts.length > 0 ? (
                        subProducts.map(p => renderProductCard(p, 'list'))
                      ) : (
                        isPreviewMode && <p className="text-sm text-gray-400 italic px-4 py-2">Vacío. Añade productos desde la pestaña Productos.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {filteredProducts.length === 0 && (
          <p className="text-center py-10 opacity-70" style={{ color: pageTextColor }}>No hay productos en esta categoría.</p>
        )}
      </div>
      
      {/* End Content Wrapper */}
      </div>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <div className={`${isPreviewMode ? 'absolute' : 'fixed'} bottom-[100px] left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300`}>
          <div
            onClick={() => { setShowCart(true); setShowBill(false); }}
            role="button"
            tabIndex={0}
            className="w-full text-white p-3 px-4 rounded-full flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.2)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform backdrop-blur-md border border-white/10"
            style={{ backgroundColor: brandColor, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15), rgba(255,255,255,0))' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shadow-inner">
                {cartCount}
              </div>
              <span className="font-bold text-lg tracking-tight">Ver pedido</span>
            </div>
            <span className="font-bold text-lg pr-2">Bs {cartTotal.toLocaleString('es-BO')}</span>
          </div>
        </div>
      )}

      {/* End Main Content Wrapper */}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full sm:w-[480px] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[85dvh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-48 sm:h-64 bg-gray-100 flex-shrink-0">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
              )}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                <p className="text-xl font-bold" style={{ color: brandColor }}>Bs {selectedProduct.price}</p>
              </div>
              <p className="text-gray-600 mb-8">{selectedProduct.description || 'Sin descripción.'}</p>

              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <FileText size={16} /> Instrucciones especiales
                  </label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Sin cebolla, extra picante..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none h-24 focus:ring-2 focus:outline-none"
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Cantidad</span>
                  <div className="flex items-center gap-4 bg-gray-50 rounded-full border border-gray-200 p-1">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-4 text-center font-bold text-lg">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-900"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
              <button 
                onClick={handleAddToCart}
                disabled={!selectedProduct.is_available}
                className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg disabled:opacity-50 transition-transform active:scale-[0.98]"
                style={{ backgroundColor: brandColor }}
              >
                {selectedProduct.is_available 
                  ? `Agregar al pedido · Bs ${(selectedProduct.price * quantity).toLocaleString('es-BO')}`
                  : 'Producto agotado'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Tu Pedido</h2>
            <button 
              onClick={() => setShowCart(false)}
              className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <p className="text-gray-500 font-medium">Mesa {table.table_number}</p>
            
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                <p>Tu pedido está vacío.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-4">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0 mt-1">
                      {item.quantity}x
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-900">{item.product.name}</h4>
                        <p className="font-bold" style={{ color: brandColor }}>Bs {item.product.price * item.quantity}</p>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-1">Nota: {item.notes}</p>
                      )}
                      <button 
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-red-500 text-sm font-medium mt-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 pb-[100px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-500 font-medium">Total a pagar</span>
              <span className="text-2xl font-bold text-gray-900">Bs {cartTotal.toLocaleString('es-BO')}</span>
            </div>
            
            <button 
              onClick={handleSubmitOrder}
              disabled={cartItems.length === 0 || isSubmitting}
              className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg disabled:opacity-50 transition-transform active:scale-[0.98] flex justify-center"
              style={{ backgroundColor: brandColor }}
            >
              {isSubmitting ? (
                <span className="animate-pulse">Enviando a cocina...</span>
              ) : (
                'Confirmar y enviar a cocina'
              )}
            </button>
          </div>
        </div>
      )}
      {/* Bill Modal */}
      {showBill && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Mi Cuenta</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleFetchBill(true)}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
              >
                Actualizar
              </button>
              <button onClick={() => setShowBill(false)} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {isFetchingBill ? (
              <div className="text-center text-gray-500 py-10">Cargando tu cuenta...</div>
            ) : billOrders.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <FileText className="mx-auto mb-4 opacity-50" size={48} />
                Aún no tienes pedidos registrados en esta mesa.
              </div>
            ) : (
              <div className="space-y-6">
                {billOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        order.status === 'delivered' ? 'bg-gray-100 text-gray-600' :
                        order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status === 'delivered' ? 'Entregado' : 
                         order.status === 'ready' ? 'Listo para servir' : 'En preparación'}
                      </span>
                    </div>
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center mb-2">
                        <div className="text-gray-900 text-sm">
                          <span className="font-bold mr-2 text-gray-500">{item.quantity}x</span>
                          {item.product_name}
                        </div>
                        <div className="font-medium text-gray-900 text-sm">Bs {item.total_price.toLocaleString('es-BO')}</div>
                      </div>
                    ))}
                    <div className="border-t mt-3 pt-3 flex justify-between items-center font-bold text-gray-900">
                      <span>Total parcial</span>
                      <span>Bs {order.total.toLocaleString('es-BO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 pb-[100px] bg-white border-t border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold text-gray-900">Total acumulado</span>
              <span className="text-2xl font-bold" style={{ color: brandColor }}>
                Bs {totalBill.toLocaleString('es-BO')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={serviceRequestLoading}
                onClick={() => handleServiceRequest('calling_waiter')}
                className="py-3 rounded-xl font-bold text-gray-700 bg-gray-100 border border-gray-200 active:scale-95 transition-transform"
              >
                Llamar al mesero
              </button>
              <button
                disabled={serviceRequestLoading || billOrders.length === 0}
                onClick={() => handleServiceRequest('requesting_bill')}
                className="py-3 rounded-xl font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                Pedir la cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Message Modal */}
      {serviceMessage && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl scale-in-center">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Listo!</h3>
              <p className="text-gray-600">{serviceMessage}</p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => setServiceMessage(null)}
                className="w-full py-3 rounded-xl font-bold text-white transition-colors"
                style={{ backgroundColor: brandColor }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation Bar ── */}
      <nav className={`${isPreviewMode ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-end justify-around h-16 max-w-lg mx-auto relative px-6">
          {/* Cuenta (Left) */}
          <button 
            onClick={() => { if (!isPreviewMode) handleFetchBill(); }}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 transition-colors w-16"
            style={{ color: showBill ? (isLightBrand ? '#1F2933' : brandColor) : '#9CA3AF' }}
          >
            <FileText size={22} />
            <span className="text-[11px] font-semibold">Cuenta</span>
          </button>

          {/* Menú (Center - Elevated FAB) */}
          <div className="flex flex-col items-center -mt-5 relative">
            <button 
              onClick={() => { setShowCart(false); setShowBill(false); setSelectedCatId(null); onCategoryChange?.(null); setSearchQuery(''); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] border-4 ${isLightBrand ? 'border-gray-100' : 'border-white'} active:scale-90 transition-transform`}
              style={{ backgroundColor: brandColor }}
            >
              <LayoutGrid size={24} style={{ color: isLightBrand ? '#1F2933' : '#FFF' }} />
            </button>
            <span className="text-[11px] font-semibold mt-0.5" style={{ color: (!showCart && !showBill) ? brandColor : '#9CA3AF' }}>Menú</span>
          </div>

          {/* Pedido (Right) */}
          <button 
            onClick={() => { if (!isPreviewMode) { setShowCart(true); setShowBill(false); } }}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 relative transition-colors w-16"
            style={{ color: showCart ? (isLightBrand ? '#1F2933' : brandColor) : '#9CA3AF' }}
          >
            <ShoppingCart size={22} />
            <span className="text-[11px] font-semibold">Pedido</span>
            {cartCount > 0 && (
              <span 
                className="absolute top-0.5 right-0 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
                style={{ backgroundColor: brandColor }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
