const fs = require('fs');
const file = 'apps/web/src/app/api/siat/emitir/route.ts';
let content = fs.readFileSync(file, 'utf8');

const oldDbCall = `    // 1. Obtener la configuración del SIAT y los datos de la orden
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', orderData.restaurant_id)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }`;

const newDbCall = `    // 1. Obtener la configuración del SIAT y los datos de la orden
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', orderData.restaurant_id)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }
    
    // Obtener la configuración de la sucursal
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis, siat_cufd, siat_codigo_control_cufd')
      .eq('id', orderData.branch_id)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }`;

content = content.replace(oldDbCall, newDbCall);

content = content.replace("!siatSettings.siat_cuis || !siatSettings.siat_cufd", "!branchData.siat_cuis || !branchData.siat_cufd");

content = content.replace(/siatSettings\.siat_cuis/g, "branchData.siat_cuis");
content = content.replace(/siatSettings\.siat_cufd/g, "branchData.siat_cufd");
content = content.replace(/siatSettings\.siat_codigo_control_cufd/g, "branchData.siat_codigo_control_cufd");
content = content.replace(/siatSettings\.siat_codigo_punto_venta/g, "branchData.siat_codigo_punto_venta");
content = content.replace(/siatSettings\.siat_codigo_sucursal/g, "branchData.siat_codigo_sucursal");

fs.writeFileSync(file, content);
