import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from "./src/lib/supabase-admin";

async function main() {
    const { data: invoices } = await supabaseAdmin.from('invoices').select('*').order('created_at', { ascending: false }).limit(1);
    if (!invoices || invoices.length === 0) {
        console.log("No invoices found");
        return;
    }
    const inv = invoices[0];
    console.log(`Anulando factura: ${inv.cuf}`);

    const res = await fetch("http://localhost:3000/api/siat/anular", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            restaurantId: inv.restaurant_id,
            cuf: inv.cuf,
            codigoMotivoAnulacion: 1
        })
    });
    
    // Si no está corriendo el server, podemos hacer lo mismo via la función local
}
main();
