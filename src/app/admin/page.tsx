import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ListChecks, Users, Network, Settings, ArrowRight, Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PASOS = [
  { num: 1, label: 'Sede y Categorías',   desc: 'Configurá el club y las divisiones del torneo.',    href: '/admin/configuracion', icon: Settings   },
  { num: 2, label: 'Inscripciones',       desc: 'Anotá a los jugadores (o parejas) por categoría.',  href: '/admin/inscripciones', icon: Users      },
  { num: 3, label: 'Armado de Cuadros',   desc: 'Creá las zonas y asigná los jugadores.',            href: '/admin/cuadros',      icon: Network    },
  { num: 4, label: 'Gestión de Partidos', desc: 'Cargá resultados del día.',                         href: '/admin/partidos',     icon: ListChecks },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let torneo: any = null
  let stats = { inscriptos: 0, categorias: 0, partidos_pendientes: 0 }
  let fetchError = null

  if (user) {
    const { data: torneosActivos, error } = await supabase
      .from('torneos')
      .select('*')
      .eq('estado', 'En curso')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) fetchError = error
    torneo = torneosActivos?.[0] ?? null

    if (torneo) {
      const [resIns, resCat, resPart] = await Promise.all([
        supabase.from('inscripciones').select('id', { count: 'exact', head: true }).eq('torneo_id', torneo.id),
        supabase.from('categorias').select('id', { count: 'exact', head: true }),
        supabase.from('partidos').select('id', { count: 'exact', head: true }).eq('torneo_id', torneo.id).eq('estado', 'pendiente'),
      ])
      stats = {
        inscriptos: resIns.count ?? 0,
        categorias: resCat.count ?? 0,
        partidos_pendientes: resPart.count ?? 0,
      }
    }
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto p-5 bg-red-900 border border-red-500 rounded-lg text-white mt-10">
        <h2 className="font-bold text-xl mb-2">Error de Base de Datos</h2>
        <p className="text-sm opacity-90 mb-4">El query falló. Esto suele pasar cuando falta una columna (como `created_at`) o hay un problema de relaciones.</p>
        <pre className="text-xs opacity-70 whitespace-pre-wrap bg-black/30 p-3 rounded">{JSON.stringify(fetchError, null, 2)}</pre>
      </div>
    )
  }

  if (!torneo) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in pt-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-5">
          <Trophy size={28} className="text-slate-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-100">Sin torneo activo</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-xs">
          No tenés ningún torneo en curso aún. Creá uno desde "Mis Torneos" para empezar a operar.
        </p>
        <Link href="/admin/torneos" className="btn-primary inline-flex mt-6">
          Ir a Mis Torneos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-brand-600/10 border border-brand-500/30 rounded-2xl px-6 py-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-brand-400 font-semibold uppercase tracking-widest">Torneo activo</p>
          <h2 className="text-2xl font-extrabold text-slate-100 mt-0.5">{torneo.nombre}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/torneos" className="text-xs font-semibold text-slate-400 hover:text-brand-400 transition-colors bg-surface-card border border-surface-border px-4 py-2 rounded-xl">
            Gestionar otros torneos
          </Link>
          <div className="hidden md:flex gap-6 text-center ml-4">
            <div>
              <p className="text-2xl font-bold text-brand-400">{stats.inscriptos}</p>
              <p className="text-xs text-slate-500">Inscriptos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{stats.partidos_pendientes}</p>
              <p className="text-xs text-slate-500">Pendientes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-300">{stats.categorias}</p>
              <p className="text-xs text-slate-500">Categorías</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-4">Flujo de operación</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {PASOS.map(({ num, label, desc, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group bg-surface-card border border-surface-border hover:border-brand-500/40 hover:bg-brand-500/5 rounded-xl p-5 flex items-start gap-4 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-surface border border-surface-border flex items-center justify-center shrink-0 group-hover:border-brand-500/50 group-hover:bg-brand-500/10 transition-colors">
                <Icon size={18} className="text-slate-400 group-hover:text-brand-400 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paso {num}</span>
                <p className="font-semibold text-slate-200 mt-0.5 group-hover:text-brand-300 transition-colors">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 shrink-0 mt-1 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
