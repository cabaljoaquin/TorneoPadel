import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Inyectamos el pathname ANTES de procesar, para que updateSession y los layouts puedan leerlo
  request.headers.set('x-pathname', request.nextUrl.pathname)

  const response = await updateSession(request)

  // Preservamos redirects — solo agregamos el header a respuestas normales
  if (response.status !== 200 || response.headers.get('location')) {
    return response
  }

  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
