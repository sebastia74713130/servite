const fs = require('fs');
const file = 'apps/web/src/app/(dashboard)/menu/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import for copyMenuFromMainBranch
content = content.replace("import { Trash2 } from 'lucide-react';", "import { Trash2 } from 'lucide-react';\nimport { copyMenuFromMainBranch } from '@/app/actions';");

// Add handleCopy function
const oldReturn = `  return (\n    <div className="flex flex-col gap-6 h-full">`;
const newReturn = `  const [copying, setCopying] = useState(false);
  
  const handleCopyMenu = async () => {
    if (!restaurant?.id || !branch?.id) return;
    if (!confirm("¿Seguro que deseas copiar el menú de la sucursal principal? Esto reemplazará tu menú actual en esta sucursal.")) return;
    setCopying(true);
    try {
      await copyMenuFromMainBranch(restaurant.id, branch.id);
      await refetchCats();
      await refetchProds();
      alert("Menú copiado exitosamente");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
    setCopying(false);
  };

  return (
    <div className="flex flex-col gap-6 h-full">`;
content = content.replace(oldReturn, newReturn);

// Add button
const oldButtons = `<button
          onClick={() => router.push('/menu/design')}
          className="flex items-center gap-2 bg-[#1F2933] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#323F4B] transition-colors shadow-sm"
        >
          <Palette size={18} />
          Editar diseño del menú
        </button>`;

const newButtons = `<div className="flex flex-wrap gap-2 justify-end mt-4 sm:mt-0">
          <button
            onClick={handleCopyMenu}
            disabled={copying}
            className="flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#1F2933] px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles size={18} />
            {copying ? 'Copiando...' : 'Copiar menú principal'}
          </button>
          <button
            onClick={() => router.push('/menu/design')}
            className="flex items-center gap-2 bg-[#1F2933] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#323F4B] transition-colors shadow-sm"
          >
            <Palette size={18} />
            Editar diseño
          </button>
        </div>`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync(file, content);
