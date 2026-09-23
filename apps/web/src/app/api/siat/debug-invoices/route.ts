import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { data, error } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        return NextResponse.json({ invoices: data || [], error });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
