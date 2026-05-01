import { createClient } from '@/utils/supabase/server'
import TorneosClient from './TorneosClient'

export const dynamic = 'force-dynamic'

export default async function TorneosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: torneos, error } = user
    ? await supabase
        .from('torneos')
        .select('*, sedes(nombre)')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 bg-red-900 border border-red-500 rounded-lg text-white">
        <h2 className="font-bold">Error obteniendo torneos</h2>
        <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
      </div>
    )
  }

  return <TorneosClient torneos={torneos ?? []} userId={user?.id ?? ''} />
}
