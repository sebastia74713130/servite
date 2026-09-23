import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    
    if (!restaurantId) {
        return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('invoices')
            .select('*, orders(id, table_number, total, customer_name, customer_nit)')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return NextResponse.json({ invoices: data || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
