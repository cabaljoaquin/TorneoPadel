import { createClient } from '@/utils/supabase/server'
import PlayoffsClient from './PlayoffsClient'

export const dynamic = 'force-dynamic'

export default async function PlayoffsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <PlayoffsClient userId={user?.id ?? ''} />
}
