const fs = require('fs');

// Emitir API
let emitirFile = 'apps/web/src/app/api/siat/emitir/route.ts';
let emitirContent = fs.readFileSync(emitirFile, 'utf8');

// Needs orderData.branch_id to fetch branchData
// wait, emitir takes `invoiceId`
emitirContent = emitirContent.replace(
  "const { invoiceId } = body;",
  "const { invoiceId } = body;" // No change here, but wait, emitir uses orderData!
);

const emitirDbCallOld = `    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();`;

const emitirDbCallNew = `    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis, siat_cufd, siat_codigo_control_cufd')
      .eq('id', orderData.branch_id)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }`;

emitirContent = emitirContent.replace(emitirDbCallOld, emitirDbCallNew);

emitirContent = emitirContent.replace(/siatSettings\.siat_cuis/g, "branchData.siat_cuis");
emitirContent = emitirContent.replace(/siatSettings\.siat_cufd/g, "branchData.siat_cufd");
emitirContent = emitirContent.replace(/siatSettings\.siat_codigo_control_cufd/g, "branchData.siat_codigo_control_cufd");
emitirContent = emitirContent.replace(/siatSettings\.siat_codigo_punto_venta/g, "branchData.siat_codigo_punto_venta");
emitirContent = emitirContent.replace(/siatSettings\.siat_codigo_sucursal/g, "branchData.siat_codigo_sucursal");

fs.writeFileSync(emitirFile, emitirContent);

// Sincronizar API
let syncFile = 'apps/web/src/app/api/siat/sincronizar/route.ts';
let syncContent = fs.readFileSync(syncFile, 'utf8');

syncContent = syncContent.replace("const { restaurantId } = body;", "const { restaurantId, branchId } = body;");

const syncDbCallOld = `    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();`;

const syncDbCallNew = `    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }`;

syncContent = syncContent.replace(syncDbCallOld, syncDbCallNew);

syncContent = syncContent.replace(/siatSettings\.siat_cuis/g, "branchData.siat_cuis");
syncContent = syncContent.replace(/siatSettings\.siat_codigo_punto_venta/g, "branchData.siat_codigo_punto_venta");
syncContent = syncContent.replace(/siatSettings\.siat_codigo_sucursal/g, "branchData.siat_codigo_sucursal");

fs.writeFileSync(syncFile, syncContent);

// Settings page (branch?.id type error because I wrote `branch?.id`)
let settingsFile = 'apps/web/src/app/(dashboard)/settings/page.tsx';
let settingsContent = fs.readFileSync(settingsFile, 'utf8');

settingsContent = settingsContent.replace("const { restaurant, loading: sessionLoading } = useRestaurantSession();", "const { restaurant, branch, isMainBranch, loading: sessionLoading } = useRestaurantSession();");
settingsContent = settingsContent.replace("<SiatSettingsForm restaurantId={restaurant.id} />", "<SiatSettingsForm restaurantId={restaurant.id} branchId={branch?.id} isMainBranch={isMainBranch} />");

fs.writeFileSync(settingsFile, settingsContent);

