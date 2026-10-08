import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, subtotal, total, status, table_id, created_at, order_items(id, product_name, quantity, unit_price, total_price)')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.dir(orders, { depth: null });
}

run();
