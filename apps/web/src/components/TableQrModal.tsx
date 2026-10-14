"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Sparkles,
  Info
} from "lucide-react";
import { RestaurantTable } from "@shared/types";

interface TableQrModalProps {
  table: RestaurantTable | null;
  restaurant: any;
  isOpen: boolean;
  onClose: () => void;
}

export function TableQrModal({ table, restaurant, isOpen, onClose }: TableQrModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !table || !restaurant) return null;

  // Generar URL con formato: https://[slug].[dominio]/[codigo] o fallback a origin
  let rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  let protocol = "https:";
  let origin = typeof window !== "undefined" ? window.location.origin : "https://servido.app";
  
  if (!rootDomain && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    rootDomain = hostname === "localhost" ? window.location.host : hostname.split(".").slice(-2).join(".");
    protocol = window.location.protocol;
  }
  
  const tableUrl = rootDomain 
    ? `${protocol}//${restaurant.slug}.${rootDomain}/${encodeURIComponent(table.table_code)}`
    : `${origin}/m/${restaurant.slug}/${encodeURIComponent(table.table_code)}`;

  const isTakeaway = table.type === "takeaway";
  const displayName = isTakeaway
    ? table.table_number.toLowerCase().startsWith("barra")
      ? table.table_number
      : `Barra ${table.table_number}`
    : table.table_number.toLowerCase().startsWith("mesa")
      ? table.table_number
      : `Mesa ${table.table_number}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(tableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Error al copiar enlace", e);
    }
  };

  const handleDownloadPng = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.onload = () => {
      // Fondo blanco redondeado
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 800, 800);

      // Dibujar QR centrado
      ctx.drawImage(img, 100, 100, 600, 600);

      // Descargar
      const link = document.createElement("a");
      link.download = `QR-${restaurant.slug}-${table.table_code}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${displayName} - QR - ${restaurant.name}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              margin: 0;
              color: #1F2933;
              text-align: center;
            }
            .card {
              border: 2px dashed #E5E7EB;
              border-radius: 24px;
              padding: 32px 24px;
              max-width: 340px;
              width: 100%;
              box-sizing: border-box;
            }
            .logo-placeholder {
              font-size: 20px;
              font-weight: 800;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .table-badge {
              display: inline-block;
              background: #F3F4F6;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 700;
              color: #1F2933;
              margin-bottom: 20px;
            }
            .qr-wrapper {
              margin: 12px 0 20px 0;
              display: flex;
              justify-content: center;
            }
            .cta {
              font-size: 15px;
              font-weight: 700;
              margin: 0 0 6px 0;
            }
            .sub {
              font-size: 12px;
              color: #6B7280;
              margin: 0;
            }
            .footer-tag {
              margin-top: 24px;
              font-size: 10px;
              color: #9CA3AF;
              font-weight: 600;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-placeholder">${restaurant.name}</div>
            <div class="table-badge">${displayName}</div>
            <div class="qr-wrapper">
              ${svgData}
            </div>
            <p class="cta">Escanea con tu cámara</p>
            <p class="sub">${isTakeaway ? "Para tomar tu pedido en barra" : "Para ver el menú y pedir desde tu mesa"}</p>
            <div class="footer-tag">Servido • Menú Digital</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 text-[#1F2933]">
            <div className="w-10 h-10 rounded-2xl bg-[#E76F51]/10 text-[#E76F51] flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{displayName}</h2>
              <p className="text-xs text-gray-500 font-mono">{table.table_code}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo con el QR */}
        <div className="p-6 flex flex-col items-center text-center">
          <div 
            ref={qrRef} 
            className="p-5 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm mb-4 relative group"
          >
            <QRCodeSVG
              value={tableUrl}
              size={220}
              level="H"
              includeMargin={true}
              imageSettings={restaurant.logo_url ? {
                src: restaurant.logo_url,
                x: undefined,
                y: undefined,
                height: 48,
                width: 48,
                excavate: true,
              } : undefined}
            />
          </div>

          <p className="text-sm font-bold text-gray-800 mb-1">
            {isTakeaway ? "Código QR para Barra / Takeaway" : `Código QR de la ${displayName}`}
          </p>
          <p className="text-xs text-gray-500 max-w-xs mb-5">
            {isTakeaway 
              ? "Los clientes escanean este código para realizar pedidos rápidos en barra."
              : "Los comensales sentados en esta mesa podrán ver la carta y pedir directamente."}
          </p>

          {/* Enlace directo */}
          <div className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 mb-5 text-left">
            <span className="text-xs font-mono text-gray-600 truncate mr-2 select-all">
              {tableUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs font-bold text-[#E76F51] hover:text-[#d65e40] bg-white border border-[#E76F51]/30 hover:border-[#E76F51] px-2.5 py-1 rounded-xl transition-all shadow-sm flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-green-600" />
                  <span className="text-green-600">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Acciones principales */}
          <div className="w-full grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadPng}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-800 font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-sm hover:bg-gray-50"
            >
              <Download size={16} />
              <span>Descargar PNG</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-[#E76F51] hover:bg-[#d65e40] text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-sm"
            >
              <Printer size={16} />
              <span>Imprimir QR</span>
            </button>
          </div>
        </div>

        {/* Pie con botón de abrir en nueva pestaña */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Vista interactiva de mesa</span>
          <a
            href={tableUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#E76F51] hover:underline font-semibold"
          >
            <span>Abrir menú</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

