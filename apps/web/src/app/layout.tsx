import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    template: "%s | Servido",
    default: "Servido | Sistema Inteligente para Restaurantes",
  },
  description: "Gestiona tu restaurante, cafetería o bar con Servido. Menú QR, facturación SIAT, inventarios, y control de mesas en un solo lugar.",
  keywords: ["software para restaurantes", "sistema POS", "menú QR", "facturación SIAT", "gestión gastronómica", "Bolivia", "restaurantes"],
  openGraph: {
    type: "website",
    locale: "es_BO",
    title: "Servido | Sistema Inteligente para Restaurantes",
    description: "El sistema más completo para gestionar tu restaurante, cafetería o bar. Facturación SIAT, menú QR y mucho más.",
    siteName: "Servido",
  },
  twitter: {
    card: "summary_large_image",
    title: "Servido | Software para Restaurantes",
    description: "Gestión gastronómica inteligente para tu negocio.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-white text-[#1F2933] font-sans min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
