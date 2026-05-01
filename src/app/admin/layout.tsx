import type { Metadata } from 'next'
import { headers } from 'next/headers'
import AdminLayoutClient from '@/components/admin/AdminLayoutClient'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    template: '%s | Admin — TorneoTenis',
    default:  'Panel de Administración | TorneoTenis',
  },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') ?? headersList.get('x-pathname') ?? ''

  // Si estamos en el login, no mostramos el layout del panel
  if (pathname.includes('/admin/login')) {
    return <>{children}</>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Sin sesión activa tampoco mostramos el layout (el proxy redirige al login igualmente)
  if (!user) return <>{children}</>

  let torneoCount = 0
  const { count } = await supabase
    .from('torneos')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', user.id)
  torneoCount = count ?? 0

  return <AdminLayoutClient torneoCount={torneoCount}>{children}</AdminLayoutClient>
}

