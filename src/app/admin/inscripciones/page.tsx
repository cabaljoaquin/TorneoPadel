import { createClient } from '@/utils/supabase/server'
import InscripcionesClient from './InscripcionesClient'

export const dynamic = 'force-dynamic'

export default async function InscripcionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <InscripcionesClient userId={user?.id ?? ''} />
}
