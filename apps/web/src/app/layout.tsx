import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Servido — Panel de restaurante",
  description: "Gestiona tu restaurante con Servido",
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
