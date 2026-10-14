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

interface MenuQrModalProps {
  restaurant: any;
  isOpen: boolean;
  onClose: () => void;
}

export function MenuQrModal({ restaurant, isOpen, onClose }: MenuQrModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !restaurant) return null;

  // Construir la URL universal para el menú digital
  const origin = typeof window !== "undefined" ? window.location.origin : "https://servido.app";
  const menuUrl = `${origin}/m/${restaurant.slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
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
      link.download = `Menu-Digital-${restaurant.slug}.png`;
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
          <title>Carta Virtual - ${restaurant.name}</title>
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
              border: 2px solid #E5E7EB;
              border-radius: 24px;
              padding: 40px 30px;
              max-width: 360px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            }
            h1 {
              font-size: 26px;
              font-weight: 800;
              margin: 0 0 6px 0;
              color: #111827;
            }
            .subtitle {
              font-size: 14px;
              font-weight: 600;
              color: #E76F51;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              margin: 20px 0;
            }
            .qr-wrapper svg {
              width: 240px;
              height: 240px;
            }
            .instruction {
              font-size: 13px;
              color: #4B5563;
              margin: 18px 0 6px 0;
              line-height: 1.4;
            }
            .url {
              font-size: 11px;
              color: #9CA3AF;
              font-family: monospace;
              word-break: break-all;
            }
            .footer {
              margin-top: 24px;
              font-size: 10px;
              color: #9CA3AF;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${restaurant.name}</h1>
            <div class="subtitle">Menú Digital • Carta Virtual</div>
            <div class="qr-wrapper">
              ${svgData}
            </div>
            <p class="instruction">
              Escanea este código con la cámara de tu teléfono para explorar nuestros platos, bebidas y precios.
            </p>
            <div class="url">${menuUrl}</div>
            <div class="footer">Servido • Menú Inteligente</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E76F51]/10 text-[#E76F51] flex items-center justify-center">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                QR Menú Digital
              </h2>
              <p className="text-xs text-slate-500">
                Carta virtual no interactiva
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

        {/* Body */}
        <div className="p-6 text-center space-y-5">
          {/* Info pill */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-left">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Carta de solo lectura:</strong> Dedicada exclusivamente a la visualización de tus productos, fotos y precios. Ideal para carteles, redes sociales, mostrador o mesas sin autopedido.
            </p>
          </div>

          {/* QR Display */}
          <div className="flex flex-col items-center">
            <div 
              ref={qrRef}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm inline-flex justify-center items-center hover:shadow-md transition-shadow"
            >
              <QRCodeSVG
                value={menuUrl}
                size={220}
                level="H"
                includeMargin={true}
                imageSettings={restaurant.logo_url ? {
                  src: restaurant.logo_url,
                  height: 38,
                  width: 38,
                  excavate: true
                } : undefined}
              />
            </div>

            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono max-w-full truncate">
              <span className="truncate">{menuUrl}</span>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-600">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>

            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
            >
              <ExternalLink size={16} />
              <span>Abrir Menú</span>
            </a>

            <button
              onClick={handleDownloadPng}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E76F51] hover:bg-[#d65e40] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Descargar PNG</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F2933] hover:bg-[#323F4B] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <Printer size={16} />
              <span>Imprimir Ficha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

