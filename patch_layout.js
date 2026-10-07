const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'apps/web/src/app/(dashboard)/layout.tsx');
let code = fs.readFileSync(file, 'utf8');

const targetImport = `import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { LoadingState } from "@/components/LoadingState";`;
const replacementImport = `import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { LoadingState } from "@/components/LoadingState";
import { Lock } from "lucide-react";
import Link from "next/link";`;

code = code.replace(targetImport, replacementImport);

const targetReturn = `  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {billingCycle?.limit_exceeded && (
        <div className="bg-[#E76F51] text-white text-center py-2 px-4 text-sm font-medium">
          Has superado tu límite de tickets mensuales. Tu servicio sigue activo sin interrupciones. El excedente será facturado en el próximo ciclo.
        </div>
      )}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="lg:ml-64 flex-1 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );`;

const replacementReturn = `  const isMenuOrSettings = pathname.startsWith('/menu') || pathname.startsWith('/settings');
  const isSubscriptionActive = restaurant.subscription_status === 'active';
  const shouldBlock = !isSubscriptionActive && !isMenuOrSettings;

  if (shouldBlock) {
    if (isKitchen) {
       return (
         <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <Lock size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Suscripción Inactiva</h2>
              <p className="text-gray-500 mb-6">Para acceder a este módulo y operar tu restaurante, necesitas activar un plan.</p>
              <Link href="/settings/subscription" className="bg-[#E76F51] text-white px-6 py-3 rounded-xl font-bold inline-block hover:bg-[#d65e40] transition-colors">
                Ver Planes de Suscripción
              </Link>
            </div>
         </div>
       );
    }
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="lg:ml-64 flex-1 p-4 lg:p-8 flex items-center justify-center">
           <div className="text-center max-w-md bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
              <Lock size={64} className="mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Suscripción Inactiva</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">Para acceder a este módulo y comenzar a operar tu restaurante, necesitas elegir un plan de suscripción.</p>
              <Link href="/settings/subscription" className="bg-[#E76F51] text-white px-8 py-4 rounded-xl font-bold inline-block hover:bg-[#d65e40] transition-colors shadow-md">
                Activar Suscripción
              </Link>
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {billingCycle?.limit_exceeded && (
        <div className="bg-[#E76F51] text-white text-center py-2 px-4 text-sm font-medium">
          Has superado tu límite de tickets mensuales. Tu servicio sigue activo sin interrupciones. El excedente será facturado en el próximo ciclo.
        </div>
      )}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="lg:ml-64 flex-1 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );`;

code = code.replace(targetReturn, replacementReturn);
fs.writeFileSync(file, code);
console.log('Patched layout');
