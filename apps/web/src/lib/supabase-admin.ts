import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() || 'https://dummy.supabase.co';
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() || 'dummy';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Faltan las variables de entorno de Supabase Admin (URL o SERVICE_ROLE_KEY).');
}

// Este cliente SIEMPRE salta las reglas de seguridad (RLS).
// NUNCA debe ser importado en componentes del lado del cliente ("use client").
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
