const fs = require('fs');
const file = 'apps/web/src/components/SiatSettingsForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Props
content = content.replace(
  "export function SiatSettingsForm({ restaurantId }: SiatSettingsFormProps) {",
  "export function SiatSettingsForm({ restaurantId, branchId, isMainBranch }: { restaurantId: string, branchId?: string, isMainBranch?: boolean }) {"
);

// We need to fetch both restaurant_siat_settings AND the branch's SIAT settings
const oldFetch = `      const { data, error } = await supabase
        .from('restaurant_siat_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();
        
      if (data) {
        setNit(data.siat_nit || '');
        setSucursal(data.siat_codigo_sucursal?.toString() || '0');
        setPuntoVenta(data.siat_codigo_punto_venta?.toString() || '0');
        setCafc(data.siat_cafc || '');
        
        setCuis(data.siat_cuis || '');
        setCufd(data.siat_cufd || '');
        setCufdVigencia(data.cufd_fecha_vigencia || '');
        
        // No cargamos certPassword por seguridad (siempre quedará en blanco en el UI)
      }`;

const newFetch = `      const { data, error } = await supabase
        .from('restaurant_siat_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();
        
      if (data) {
        setNit(data.siat_nit || '');
        setCafc(data.siat_cafc || '');
      }

      if (branchId) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis, siat_cufd, cufd_fecha_vigencia')
          .eq('id', branchId)
          .single();
          
        if (branchData) {
          setSucursal(branchData.siat_codigo_sucursal || '0');
          setPuntoVenta(branchData.siat_codigo_punto_venta || '0');
          setCuis(branchData.siat_cuis || '');
          setCufd(branchData.siat_cufd || '');
          setCufdVigencia(branchData.cufd_fecha_vigencia || '');
        }
      }`;

content = content.replace(oldFetch, newFetch);

// On save, we must update both tables!
const oldSave = `      const { error } = await supabase
        .from('restaurant_siat_settings')
        .upsert({
          restaurant_id: restaurantId,
          siat_nit: nit,
          siat_codigo_sucursal: parseInt(sucursal),
          siat_codigo_punto_venta: parseInt(puntoVenta),
          siat_cafc: cafc,
          // only update password if provided
          ...(certPassword ? { siat_cert_password: certPassword } : {})
        });

      if (error) throw error;`;

const newSave = `      if (isMainBranch !== false) {
        const { error } = await supabase
          .from('restaurant_siat_settings')
          .upsert({
            restaurant_id: restaurantId,
            siat_nit: nit,
            siat_cafc: cafc,
            ...(certPassword ? { siat_cert_password: certPassword } : {})
          });
        if (error) throw error;
      }

      if (branchId) {
        const { error: branchError } = await supabase
          .from('branches')
          .update({
            siat_codigo_sucursal: sucursal,
            siat_codigo_punto_venta: puntoVenta
          })
          .eq('id', branchId);
        if (branchError) throw branchError;
      }`;

content = content.replace(oldSave, newSave);

// Disable fields properly
content = content.replace(/disabled=\{saving\}/g, "disabled={saving || isMainBranch === false}");

// We need to re-enable them for sucursal and punto_venta
content = content.replace(
  "value={sucursal}\n              onChange={(e) => setSucursal(e.target.value)}\n              disabled={saving || isMainBranch === false}",
  "value={sucursal}\n              onChange={(e) => setSucursal(e.target.value)}\n              disabled={saving}"
);

content = content.replace(
  "value={puntoVenta}\n              onChange={(e) => setPuntoVenta(e.target.value)}\n              disabled={saving || isMainBranch === false}",
  "value={puntoVenta}\n              onChange={(e) => setPuntoVenta(e.target.value)}\n              disabled={saving}"
);

// Make the disabled ones gray
content = content.replace(
  /className="w-full border border-\[#E5E7EB\] rounded-xl px-4 py-3 text-\[#1F2933\] focus:outline-none focus:ring-2 focus:ring-\[#E76F51\]\/30 focus:border-\[#E76F51\] transition-colors"/g,
  "className={`w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors ${isMainBranch === false ? 'bg-gray-100' : ''}`}"
);

// Need to revert the bg-gray-100 for sucursal and puntoventa because they are editable.
// Since the regex changed all 5 inputs to have `${isMainBranch === false ? 'bg-gray-100' : ''}`, 
// we can just leave it, but it might be misleading if they are editable.
// A simpler way is to let Tailwind `disabled:bg-gray-100` handle it! 
// Let's just replace `transition-colors` with `transition-colors disabled:bg-gray-100`.

content = content.replace(
  /className=\{\`w-full border border-\[#E5E7EB\] rounded-xl px-4 py-3 text-\[#1F2933\] focus:outline-none focus:ring-2 focus:ring-\[#E76F51\]\/30 focus:border-\[#E76F51\] transition-colors \$\{isMainBranch === false \? 'bg-gray-100' : ''\}\`\}/g,
  "className=\"w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed\""
);

fs.writeFileSync(file, content);
