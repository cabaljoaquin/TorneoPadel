import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Esto evalúa la sesión y refresca el JWT si es necesario.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/admin/login')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Proteger las rutas de /admin redirigiendo al login si no hay sesión
  if (!user && isAdminRoute && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Si hay sesión y trata de ir al login, patearlo al dashboard central
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/partidos' // O /admin a secas
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
