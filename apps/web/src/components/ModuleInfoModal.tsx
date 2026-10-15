"use client";

import { 
  X, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  MessageCircle, 
  Lock, 
  Check, 
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  UtensilsCrossed,
  LayoutGrid,
  ShoppingBag,
  ChefHat,
  FileText,
  Wallet,
  Package,
  CalendarClock,
  Store
} from "lucide-react";
import Link from "next/link";
import { CanonicalModuleKey, AVAILABLE_MODULES } from "@/shared/types";

interface ModuleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleKey: CanonicalModuleKey | null;
  isActive: boolean;
  restaurantName?: string;
}

const MODULE_ICONS: Record<CanonicalModuleKey, any> = {
  menu: UtensilsCrossed,
  accounts: LayoutGrid,
  orders: ShoppingBag,
  kitchen: ChefHat,
  invoices: FileText,
  finances: Wallet,
  inventory: Package,
  reservations: CalendarClock,
  branches: Store
};

const MODULE_COLORS: Record<CanonicalModuleKey, { bg: string; text: string; border: string; lightBg: string }> = {
  menu: { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-200", lightBg: "bg-emerald-50" },
  accounts: { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-200", lightBg: "bg-blue-50" },
  orders: { bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-200", lightBg: "bg-amber-50" },
  kitchen: { bg: "bg-orange-600", text: "text-orange-600", border: "border-orange-200", lightBg: "bg-orange-50" },
  invoices: { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-200", lightBg: "bg-indigo-50" },
  finances: { bg: "bg-emerald-700", text: "text-emerald-700", border: "border-emerald-200", lightBg: "bg-emerald-50" },
  inventory: { bg: "bg-purple-600", text: "text-purple-600", border: "border-purple-200", lightBg: "bg-purple-50" },
  reservations: { bg: "bg-pink-600", text: "text-pink-600", border: "border-pink-200", lightBg: "bg-pink-50" },
  branches: { bg: "bg-teal-600", text: "text-teal-600", border: "border-teal-200", lightBg: "bg-teal-50" }
};

const MODULE_FEATURES: Record<CanonicalModuleKey, string[]> = {
  menu: [
    "Catálogo visual dinámico con fotografías de platillos en alta calidad.",
    "Generación instantánea de códigos QR para mesas, barras o mostrador.",
    "Opciones y modificadores avanzados (términos, salsas, extras y guarniciones).",
    "Pausa y activación de platillos agotados en tiempo real sin reimprimir."
  ],
  accounts: [
    "Control visual de mesas en salón con estados en vivo (libre, ocupada, pidiendo cuenta).",
    "Código QR exclusivo por mesa para que el cliente ordene y llame al mozo.",
    "Visualización de pedidos individuales por mesa con estados de preparación.",
    "Cobro ágil, división de cuentas, liberación automática de mesa e historial."
  ],
  orders: [
    "Recepción y gestión centralizada de pedidos para llevar (Takeaway) y mostrador.",
    "Código QR de mostrador para autoservicio sin filas de espera.",
    "Estimación y notificación de tiempos de preparación directo al cliente.",
    "Notificaciones sonoras en vivo al ingresar cada nueva orden."
  ],
  kitchen: [
    "Comandera táctil en tiempo real (KDS) diseñada para el ritmo acelerado de cocina.",
    "Separación inteligente por estaciones de trabajo (Parrilla, Fríos, Hornos, Barra).",
    "Semáforo de tiempos para prevenir platos fríos y agilizar las salidas.",
    "Avisos audibles y por voz cada vez que ingresa un nuevo pedido o modificación."
  ],
  invoices: [
    "Emisión de Facturas Electrónicas en Línea autorizadas por el SIN (SIAT Bolivia).",
    "Generación automática de CUF, firma digital XMLDSig y código QR tributario.",
    "Impresión directa en formato rollo térmico de 80mm y descarga en PDF.",
    "Modo contingencia Offline para seguir facturando incluso si se corta internet."
  ],
  finances: [
    "Apertura, arqueos y cierre diario de caja por turnos o cajeros.",
    "Registro ordenado de ingresos, egresos, gastos operativos y propinas.",
    "Reporte discriminado de ventas por método de pago (Efectivo, QR, Tarjeta).",
    "Exportación de movimientos detallados para conciliación contable sin descuadres."
  ],
  inventory: [
    "Control de stock de ingredientes e insumos con alertas de stock mínimo.",
    "Costeo automático de recetas (Food Cost) y cálculo de margen de ganancia real.",
    "Descuento automático de inventario con cada venta registrada en el sistema.",
    "Registro y control de compras a proveedores con historial de variaciones de costo."
  ],
  reservations: [
    "Enlace web público para que tus clientes reserven mesa desde Instagram o WhatsApp.",
    "Configuración personalizada de turnos, horarios y cupos de comensales.",
    "Confirmación automática de reservas para reducir mesas vacías por no-shows.",
    "Agenda interactiva con vista de calendario para planificar los servicios del día."
  ],
  branches: [
    "Administración centralizada de 2 o más locales desde una sola cuenta principal.",
    "Precios, cartas y menús diferenciados o unificados según cada sucursal.",
    "Comparativa de métricas, ventas y rendimiento entre todas tus ubicaciones.",
    "Permisos y accesos de personal aislados por cada sucursal."
  ]
};

const CATEGORY_NAMES: Record<string, string> = {
  salon: "Salón & Mostrador",
  cocina: "Cocina & KDS",
  caja: "Caja & Facturación",
  gestion: "Gestión & Operaciones"
};

export function ModuleInfoModal({
  isOpen,
  onClose,
  moduleKey,
  isActive,
  restaurantName = "Mi Restaurante"
}: ModuleInfoModalProps) {
  if (!isOpen || !moduleKey) return null;

  const moduleDef = AVAILABLE_MODULES[moduleKey];
  if (!moduleDef) return null;

  const Icon = MODULE_ICONS[moduleKey] || HelpCircle;
  const colors = MODULE_COLORS[moduleKey] || {
    bg: "bg-emerald-600",
    text: "text-emerald-600",
    border: "border-emerald-200",
    lightBg: "bg-emerald-50"
  };
  const features = MODULE_FEATURES[moduleKey] || [];
  const primaryRoute = moduleDef.routes[0] || "/";

  const whatsappMessage = encodeURIComponent(
    `Hola Servido, soy del restaurante *${restaurantName}*. Me interesa activar el módulo de *${moduleDef.name}* en mi cuenta. ¿Podrían brindarme información y activarlo?`
  );
  const whatsappUrl = `https://wa.me/59160520338?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${colors.lightBg} ${colors.text} flex items-center justify-center shadow-sm border ${colors.border}`}>
              <Icon size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{moduleDef.name}</h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${
                  isActive 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {isActive ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Activo</span>
                    </>
                  ) : (
                    <>
                      <Lock size={11} className="text-slate-400" />
                      <span>Disponible</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Área: <span className="font-medium text-slate-700">{CATEGORY_NAMES[moduleDef.category] || moduleDef.category}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Descripción General */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              ¿Qué hace este módulo?
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              {moduleDef.description}
            </p>
          </div>

          {/* Características Principales */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Funcionalidades destacadas
            </h3>
            <div className="space-y-2.5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={2.5} />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de suscripción y llamada a la acción */}
          <div className="p-4 rounded-2xl border bg-slate-50/50 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              {isActive ? (
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <ShieldCheck size={18} />
                  <span>Este módulo está activo e incluido en tu plan actual.</span>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-800">¿Deseas activar este módulo en tu negocio?</p>
                  <p className="text-slate-500 mt-0.5">Puedes sumarlo a tu suscripción en cualquier momento sin perder datos.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            {isActive ? (
              <Link
                href={primaryRoute}
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#2F4F3E] hover:bg-[#253f32] text-white rounded-xl shadow-sm transition-all"
              >
                <span>Ir al Módulo</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all"
              >
                <MessageCircle size={17} />
                <span>Solicitar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

