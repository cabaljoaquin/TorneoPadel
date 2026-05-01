import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { TorneosGrid, HeroText } from './TorneosGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'TorneoTenis — Viví tus torneos más de cerca',
  description: 'Seguí llaves, resultados y posiciones en tiempo real de todos los torneos de tenis.',
}

export default async function PublicHomePage() {
  const supabase = await createClient()

  const { data: torneos } = await supabase
    .from('torneos')
    .select('id, nombre, slug, estado, modalidad, created_at, fecha_inicio, sedes(nombre)')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(9)

  const torneosSorted = (torneos ?? []).sort((a, b) => {
    if (a.estado === 'En curso' && b.estado !== 'En curso') return -1
    if (b.estado === 'En curso' && a.estado !== 'En curso') return 1
    return 0
  })

  return (
    <main className="min-h-screen bg-surface">

      {/* === HERO SECTION === */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1920&auto=format&fit=crop')" }}
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-surface" />

        {/* Noise texture sutil */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

        <div className="relative z-10 px-4">
          <HeroText />
        </div>
      </section>

      {/* === TORNEOS SECTION === */}
      <section id="torneos" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-8 -mt-8 relative z-10">
        <div className="mb-10">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">Competencias</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
            Torneos Destacados
          </h2>
          <div className="w-12 h-0.5 bg-brand-500 mt-3 rounded-full" />
        </div>
        <TorneosGrid torneos={torneosSorted as any} />
      </section>
    </main>
  )
}
