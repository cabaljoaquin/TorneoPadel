import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TorneoClientView from './TorneoClientView'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params as any
  const slug = params.slug || params.id
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
  let query = supabase.from('torneos').select('nombre')
  if (isUuid) {
    query = query.eq('id', slug)
  } else {
    query = query.eq('slug', slug)
  }
  const { data: torneo } = await query.limit(1).maybeSingle()

  return {
    title: torneo ? `${torneo.nombre} — Llaves y Resultados` : 'Torneo',
    description: 'Seguí los partidos y clasificaciones en tiempo real.',
  }
}

export default async function TorneoPublicPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params as any
  const slug = params.slug || params.id
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
  let query = supabase.from('torneos').select('id, nombre, sedes(nombre)')
  if (isUuid) {
    query = query.eq('id', slug)
  } else {
    query = query.eq('slug', slug)
  }
  const { data: torneo, error } = await query.limit(1).maybeSingle()
  
  if (!torneo) {
    console.error("404 ERROR in page.tsx. Slug:", slug, "isUuid:", isUuid, "torneo:", torneo, "error:", error)
    notFound()
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <header className="py-6 px-6 border-b border-surface-border bg-surface-card text-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">
          {torneo.nombre}
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sede: {(torneo.sedes as any)?.nombre || 'General'}</p>
      </header>

      <div className="flex-1 overflow-x-hidden">
        <TorneoClientView torneoId={torneo.id} />
      </div>
    </main>
  )
}
