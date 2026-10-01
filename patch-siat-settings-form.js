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

// Disable fields if not main branch
content = content.replace(`disabled={saving}
              placeholder="Ej: 1234567018"`, `disabled={saving || isMainBranch === false}\n              placeholder="Ej: 1234567018"`);

content = content.replace(`type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              disabled={saving}
              placeholder="Contraseña del certificado .p12"`, `type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              disabled={saving || isMainBranch === false}
              placeholder="Contraseña del certificado .p12"`);

content = content.replace(`value={cafc}
              onChange={(e) => setCafc(e.target.value)}
              disabled={saving}
              placeholder="Opcional. Ej: 1011A..."`, `value={cafc}
              onChange={(e) => setCafc(e.target.value)}
              disabled={saving || isMainBranch === false}
              placeholder="Opcional. Ej: 1011A..."`);

content = content.replace(
  "className=\"w-full border border-[#E5E7EB]", 
  "className={`w-full border border-[#E5E7EB] ${isMainBranch === false ? 'bg-gray-100 cursor-not-allowed' : ''}"
);
// I will just use regex to replace all disabled inputs to have visual indication. Or we just let Tailwind disabled state handle it since we use disabled:opacity-50.

fs.writeFileSync(file, content);
