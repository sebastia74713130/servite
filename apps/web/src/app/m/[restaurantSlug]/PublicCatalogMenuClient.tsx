"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  X, 
  Clock, 
  MapPin, 
  Phone, 
  Info, 
  UtensilsCrossed, 
  MessageCircle,
  ChevronRight,
  Sparkles,
  Tag
} from "lucide-react";
import { Product, Category, Subsection } from "@/shared/types";

interface PublicCatalogMenuClientProps {
  restaurant: any;
  branch: any;
  categories: Category[];
  products: Product[];
  subsections?: Subsection[];
}

export default function PublicCatalogMenuClient({
  restaurant,
  branch,
  categories,
  products,
  subsections = []
}: PublicCatalogMenuClientProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const brandColor = restaurant.brand_color || "#E76F51";

  // Determinar si el restaurante está abierto según operating_hours (Hora Bolivia UTC-4)
  const [isOpenNow, setIsOpenNow] = useState<boolean | null>(null);
  const [todayHours, setTodayHours] = useState<string>("");

  useEffect(() => {
    if (!restaurant.operating_hours) return;

    try {
      const now = new Date();
      const boliviaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/La_Paz" }));
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDay = days[boliviaTime.getDay()];
      const schedule = restaurant.operating_hours[currentDay];

      if (!schedule || !schedule.isOpen) {
        setIsOpenNow(false);
        setTodayHours("Cerrado hoy");
        return;
      }

      setTodayHours(`${schedule.open} - ${schedule.close}`);

      const [openH, openM] = schedule.open.split(":").map(Number);
      const [closeH, closeM] = schedule.close.split(":").map(Number);
      const currentMins = boliviaTime.getHours() * 60 + boliviaTime.getMinutes();
      const openMins = openH * 60 + openM;
      let closeMins = closeH * 60 + closeM;

      if (closeMins <= openMins) closeMins += 24 * 60; // trasnoche

      if (currentMins >= openMins && currentMins < closeMins) {
        setIsOpenNow(true);
      } else {
        setIsOpenNow(false);
      }
    } catch (e) {
      console.warn("Could not calculate operating hours", e);
    }
  }, [restaurant.operating_hours]);

  // Filtrado de productos por categoría y buscador
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro de categoría
      if (selectedCatId !== "all" && p.category_id !== selectedCatId) {
        return false;
      }
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.description?.toLowerCase().includes(query);
        return matchName || matchDesc;
      }
      return true;
    });
  }, [products, selectedCatId, searchQuery]);

  // Agrupar por categoría cuando se selecciona "all" y no hay búsqueda activa
  const productsByCategory = useMemo(() => {
    if (selectedCatId !== "all" || searchQuery.trim()) return null;

    const grouped: { category: Category; items: Product[] }[] = [];
    categories.forEach((cat) => {
      const items = products.filter((p) => p.category_id === cat.id);
      if (items.length > 0) {
        grouped.push({ category: cat, items });
      }
    });
    return grouped;
  }, [categories, products, selectedCatId, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1F2933] pb-16 selection:bg-[#E76F51]/20">
      {/* ─── Hero Header & Visual Branding ────────────────────────── */}
      <header className="relative bg-white border-b border-slate-100 shadow-sm overflow-hidden">
        {/* Cover Photo o Degradado de Marca */}
        <div 
          className="h-36 sm:h-52 w-full relative bg-cover bg-center"
          style={{
            backgroundImage: restaurant.cover_url 
              ? `url(${restaurant.cover_url})` 
              : `linear-gradient(135deg, ${brandColor} 0%, #1F2933 100%)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* Info Wrapper */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 mb-4">
            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-1.5 shadow-xl border-2 border-white shrink-0 overflow-hidden flex items-center justify-center">
              {restaurant.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover rounded-2xl" 
                />
              ) : (
                <div 
                  className="w-full h-full rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl"
                  style={{ backgroundColor: brandColor }}
                >
                  {restaurant.name?.slice(0, 2).toUpperCase() || "RS"}
                </div>
              )}
            </div>

            {/* Restaurant Title & Slogan */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {restaurant.name}
                </h1>
                {isOpenNow !== null && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isOpenNow 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {isOpenNow ? "Abierto" : "Cerrado"}
                  </span>
                )}
              </div>

              {restaurant.description && (
                <p className="text-sm text-slate-600 mt-1 max-w-2xl line-clamp-2">
                  {restaurant.description}
                </p>
              )}

              {/* Quick Details Chips */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3 font-medium">
                {todayHours && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    <span>{todayHours}</span>
                  </span>
                )}
                {restaurant.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    <span className="truncate max-w-[240px]">{restaurant.address}</span>
                  </span>
                )}
                {restaurant.phone && (
                  <a 
                    href={`https://wa.me/${restaurant.phone.replace(/\D/g, "")}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-600 hover:underline"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Sticky Filter & Search Bar ────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato, ingrediente o bebida..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Horizontal Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            <button
              onClick={() => setSelectedCatId("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCatId === "all"
                  ? "bg-[#1F2933] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
              }`}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              const count = products.filter((p) => p.category_id === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                  }`}
                  style={{
                    backgroundColor: isSelected ? brandColor : undefined
                  }}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main Products List ────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <UtensilsCrossed size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No se encontraron productos
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Prueba buscando con otro término o selecciona otra categoría.
            </p>
          </div>
        ) : productsByCategory ? (
          /* Vista por secciones de categoría (cuando está en 'Todos' y sin búsqueda) */
          <div className="space-y-10">
            {productsByCategory.map(({ category, items }) => (
              <section key={category.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {category.name}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {items.length} {items.length === 1 ? "plato" : "platos"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      brandColor={brandColor}
                      onClick={() => setSelectedProduct(prod)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Vista de grilla directa (categoría seleccionada o búsqueda activa) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                brandColor={brandColor}
                onClick={() => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ─── Product Detail Modal (Solo Información) ────────────────── */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Foto de Cabecera */}
            <div className="relative h-60 sm:h-72 bg-slate-100 shrink-0 overflow-hidden">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-slate-50">
                  🍽️
                </div>
              )}

              {/* Botón Cerrar */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Badge de Disponibilidad */}
              {!selectedProduct.is_available && (
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-red-600/90 text-white rounded-full text-xs font-bold backdrop-blur-md">
                  Agotado temporalmente
                </div>
              )}
            </div>

            {/* Contenido del Detalle */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {selectedProduct.name}
                  </h2>
                  {selectedProduct.preparation_time_minutes && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <Clock size={12} />
                      <span>Tiempo estimado: {selectedProduct.preparation_time_minutes} min</span>
                    </div>
                  )}
                </div>

                <div 
                  className="text-xl sm:text-2xl font-black shrink-0"
                  style={{ color: brandColor }}
                >
                  Bs {Number(selectedProduct.price).toLocaleString("es-BO")}
                </div>
              </div>

              {/* Descripción */}
              <div className="text-sm text-slate-600 leading-relaxed pt-1">
                {selectedProduct.description || "Sin descripción detallada disponible."}
              </div>

              {/* Mensaje Informativo de Carta Digital */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Carta Digital Informativa:</strong> Este menú es solo de visualización. Por favor, solicita a tu mesero o al personal de atención para ordenar este plato.
                </span>
              </div>
            </div>

            {/* Botón de Cierre en Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-full py-3 bg-[#1F2933] hover:bg-[#323F4B] text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer Informativo ────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 text-center text-xs text-slate-400 border-t border-slate-200/60 mt-12 space-y-2">
        <p className="font-semibold text-slate-600">
          {restaurant.name}
        </p>
        <p>
          Menú Digital & Carta Virtual generada por{" "}
          <span className="font-bold text-slate-700">Servido</span>
        </p>
      </footer>
    </div>
  );
}

/* ─── Componente de Tarjeta de Producto ────────────────────────────── */
function ProductCard({
  product,
  brandColor,
  onClick
}: {
  product: Product;
  brandColor: string;
  onClick: () => void;
}) {
  const isAvailable = product.is_available;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-4 cursor-pointer text-left group ${
        !isAvailable ? "opacity-60 grayscale-[40%]" : ""
      }`}
    >
      {/* Miniatura */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-50">
            🍽️
          </div>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-[#E76F51] transition-colors truncate">
            {product.name}
          </h3>
        </div>

        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span 
            className="font-extrabold text-sm sm:text-base"
            style={{ color: brandColor }}
          >
            Bs {Number(product.price).toLocaleString("es-BO")}
          </span>

          {!isAvailable ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700">
              Agotado
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600 flex items-center gap-0.5">
              <span>Detalles</span>
              <ChevronRight size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

