import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() || 'https://dummy.supabase.co',
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || 'dummy',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Intercambiar código por sesión
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && authData?.user) {
      // Verificar si el usuario ya tiene un restaurante asociado
      const { data: restUsers } = await supabaseAdmin
        .from('restaurant_users')
        .select('id')
        .eq('user_id', authData.user.id)
        .limit(1)

      if (!restUsers || restUsers.length === 0) {
        // Es un usuario nuevo (o no tiene restaurante), llevarlo a completar el registro
        return NextResponse.redirect(`${requestUrl.origin}/register/complete`)
      }
    }
  }

  // Si hubo error, o si ya tiene restaurante, enviarlo al dashboard
  return NextResponse.redirect(`${requestUrl.origin}/`)
}
