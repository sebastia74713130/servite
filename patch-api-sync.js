const fs = require('fs');
const file = 'apps/web/src/app/api/siat/sincronizar/route.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace body parsing
content = content.replace("const { restaurantId } = body;", "const { restaurantId, branchId } = body;\n\n    if (!branchId) {\n      return NextResponse.json({ error: \"Falta el ID de la sucursal\" }, { status: 400 });\n    }");

const oldDbCall = `    // 1. Obtener la configuración del SIAT del restaurante
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }`;

const newDbCall = `    // 1. Obtener la configuración del SIAT del restaurante
    const { data: siatSettings, error: dbError } = await supabaseAdmin
      .from('restaurant_siat_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .single();

    if (dbError || !siatSettings) {
      return NextResponse.json({ error: "El restaurante no tiene configurado el SIAT" }, { status: 404 });
    }
    
    // Obtener la configuración de la sucursal
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('siat_codigo_sucursal, siat_codigo_punto_venta, siat_cuis')
      .eq('id', branchId)
      .single();

    if (branchError || !branchData) {
      return NextResponse.json({ error: "No se encontró la configuración de la sucursal" }, { status: 404 });
    }`;

content = content.replace(oldDbCall, newDbCall);

content = content.replace("!siatSettings.siat_cuis", "!branchData.siat_cuis");
content = content.replace(/siatSettings\.siat_cuis/g, "branchData.siat_cuis");
content = content.replace(/siatSettings\.siat_codigo_punto_venta/g, "branchData.siat_codigo_punto_venta");
content = content.replace(/siatSettings\.siat_codigo_sucursal/g, "branchData.siat_codigo_sucursal");

fs.writeFileSync(file, content);
