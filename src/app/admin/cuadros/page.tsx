import { createClient } from '@/utils/supabase/server'
import CuadrosWorkspace from './CuadrosClient'

export const dynamic = 'force-dynamic'

export default async function CuadrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <CuadrosWorkspace userId={user?.id ?? ''} />
}
