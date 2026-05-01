import { createClient } from '@/utils/supabase/server'
import PartidosClient from './PartidosClient'

export const dynamic = 'force-dynamic'

export default async function PartidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <PartidosClient userId={user?.id ?? ''} />
}
