'use client'

import { AnimatePresence, motion } from 'framer-motion'
import CategoryTabs from '@/components/public/CategoryTabs'
import TournamentBracket from '@/components/public/TournamentBracket'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState, useTransition } from 'react'
import confetti from 'canvas-confetti'
import { createClient } from '@/utils/supabase/client'
import { calculateStandings } from '@/utils/standingsCalculator'
import { Activity, Calendar, Trophy } from 'lucide-react'

// Utilidad para ordenar jerárquicamente las fases
const FASES_ORDER = ['32avos de Final', '16avos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final']

const MATCHES_PER_FASE: Record<string, number> = {
  '32avos de Final': 32,
  '16avos de Final': 16,
  'Octavos de Final': 8,
  'Cuartos de Final': 4,
  'Semifinal': 2,
  'Final': 1,
}

function buildBracket(partidos: any[], configLlave?: any[]): any[] {
  const eliminatorios = partidos.filter((p) => p.fase_bracket && p.fase_bracket !== 'Fase de Grupos')

  if (eliminatorios.length > 0) {
    // 1. Determine active matches to support asymmetric brackets
    const activeMatchIds = new Set<string>()

    // Initialize with matches that have participants or are explicitly configured
    eliminatorios.forEach((p) => {
      const hasParticipant = p.p1 || p.p2
      const isConfigured = configLlave?.some(
        (cfg) => cfg.fase === p.fase_bracket && cfg.match_index === p.bracket_index && (cfg.origen_p1 || cfg.origen_p2)
      )
      if (hasParticipant || isConfigured) {
        activeMatchIds.add(p.id)
      }
    })

    // Propagate forward: if A is active, its next match is active
    let addedNew = true
    while (addedNew) {
      addedNew = false
      eliminatorios.forEach((p) => {
        if (activeMatchIds.has(p.id) && p.siguiente_partido_id && !activeMatchIds.has(p.siguiente_partido_id)) {
          activeMatchIds.add(p.siguiente_partido_id)
          addedNew = true
        }
      })
    }

    // Determine the full set of phases we need to render
    const phasesToRender = Array.from(new Set(eliminatorios.map(p => p.fase_bracket)))
    phasesToRender.sort((a, b) => FASES_ORDER.indexOf(a) - FASES_ORDER.indexOf(b))

    // 2. Compute visual_index backward to align explicitly mapped asymmetric brackets
    const visualIndices = new Map<string, number>()
    
    // Auto-assign bracket_index if missing (e.g., from manual admin creation)
    phasesToRender.forEach(fase => {
      const matchesInFase = eliminatorios.filter(p => p.fase_bracket === fase)
      let nextAvailableIdx = 0
      matchesInFase.forEach(p => {
         if (p.bracket_index == null) {
           while (matchesInFase.some(m => m.bracket_index === nextAvailableIdx)) nextAvailableIdx++
           p.bracket_index = nextAvailableIdx
           nextAvailableIdx++
         }
      })
    })

    eliminatorios.forEach(p => visualIndices.set(p.id, p.bracket_index))

    for (let i = phasesToRender.length - 1; i >= 0; i--) {
      const fase = phasesToRender[i]
      const matchesInFase = eliminatorios.filter(p => p.fase_bracket === fase && activeMatchIds.has(p.id))
      
      matchesInFase.forEach(p => {
        if (p.siguiente_partido_id) {
           const nextMatchId = p.siguiente_partido_id
           if (visualIndices.has(nextMatchId)) {
             const nextVisualIdx = visualIndices.get(nextMatchId)!
             const pos = p.posicion_siguiente_partido || 1
             visualIndices.set(p.id, nextVisualIdx * 2 + (pos - 1))
           }
        }
      })
    }

    const roundsMap: Record<string, any[]> = {}
    
    phasesToRender.forEach(fase => {
      const matchesInFase = eliminatorios.filter(p => p.fase_bracket === fase)
      
      let maxIndex = (MATCHES_PER_FASE[fase] || 1) - 1
      matchesInFase.forEach(m => {
         const vIdx = visualIndices.get(m.id) ?? m.bracket_index
         if (vIdx > maxIndex) maxIndex = vIdx
      })
      
      roundsMap[fase] = []
      const count = maxIndex + 1
      
      for (let i = 0; i < count; i++) {
        const p = matchesInFase.find(m => (visualIndices.get(m.id) ?? m.bracket_index) === i)
        if (p) {
          const isActive = activeMatchIds.has(p.id)
          roundsMap[fase].push({
            id: p.id,
            bracket_index: i, // Use the visual index
            p1: p.p1?.nombre_mostrado || 'Esperando ganador...',
            p2: p.p2?.nombre_mostrado || 'Esperando ganador...',
            isP1Waiting: !p.p1,
            isP2Waiting: !p.p2,
            scoreStr: p.estado === 'finalizado' ? formatResultStr(p) : undefined,
            scoreList: p.estado === 'finalizado' ? formatResultArray(p) : [],
            p1Wins: p.estado === 'finalizado' && p.ganador_id === p.p1?.id,
            p2Wins: p.estado === 'finalizado' && p.ganador_id === p.p2?.id,
            finished: p.estado === 'finalizado',
            isPlaceholder: false,
            isHidden: !isActive,
          })
        } else {
          roundsMap[fase].push({
            id: `hidden-${fase}-${i}`,
            bracket_index: i,
            isHidden: true
          })
        }
      }
    })

    return phasesToRender.map((fase) => ({ title: fase, matches: roundsMap[fase] }))
  }

  // Sin partidos reales: mostrar bracket teórico desde configuracion_llave
  if (configLlave && configLlave.length > 0) {
    const activeIndicesByPhase: Record<string, Set<number>> = {}
    configLlave.forEach(cfg => {
      if (!activeIndicesByPhase[cfg.fase]) activeIndicesByPhase[cfg.fase] = new Set()
      if (cfg.origen_p1 || cfg.origen_p2) {
        activeIndicesByPhase[cfg.fase].add(cfg.match_index)
      }
    })

    const phases = Object.keys(activeIndicesByPhase).sort((a, b) => FASES_ORDER.indexOf(a) - FASES_ORDER.indexOf(b))
    
    // Forward propagation
    for (let i = 0; i < phases.length - 1; i++) {
      const currentFase = phases[i]
      const nextFase = phases[i + 1]
      
      if (!activeIndicesByPhase[nextFase]) activeIndicesByPhase[nextFase] = new Set()
      
      activeIndicesByPhase[currentFase].forEach(matchIdx => {
        const nextMatchIdx = Math.floor(matchIdx / 2)
        activeIndicesByPhase[nextFase].add(nextMatchIdx)
      })
    }

    // Backward pass for theoretical visual indices
    const visualIndices = new Map<string, number>()
    configLlave.forEach(cfg => visualIndices.set(cfg.id, cfg.match_index))

    for (let i = phases.length - 1; i >= 0; i--) {
      const fase = phases[i]
      const cfgs = configLlave.filter(c => c.fase === fase)
      
      cfgs.forEach(cfg => {
        const currentVisualIdx = visualIndices.get(cfg.id)!
        
        const processOrigen = (origen: string, posOffset: number) => {
          if (origen && origen.startsWith('Ganador')) {
            const parts = origen.replace('Ganador ', '').split(' - P')
            if (parts.length === 2) {
               const prevFase = parts[0].trim()
               const prevIdx = parseInt(parts[1].trim()) - 1
               const sourceCfg = configLlave.find(c => c.fase === prevFase && c.match_index === prevIdx)
               if (sourceCfg) {
                  visualIndices.set(sourceCfg.id, currentVisualIdx * 2 + posOffset)
               }
            }
          }
        }
        
        processOrigen(cfg.origen_p1, 0)
        processOrigen(cfg.origen_p2, 1)
      })
    }

    const roundsMap: Record<string, any[]> = {}
    phases.forEach(fase => {
      let maxIndex = (MATCHES_PER_FASE[fase] || 1) - 1
      configLlave.forEach(c => {
         if (c.fase === fase) {
            const vIdx = visualIndices.get(c.id) ?? c.match_index
            if (vIdx > maxIndex) maxIndex = vIdx
         }
      })

      const count = maxIndex + 1
      roundsMap[fase] = []
      
      for (let i = 0; i < count; i++) {
        const cfg = configLlave.find(c => c.fase === fase && (visualIndices.get(c.id) ?? c.match_index) === i)
        const isActive = cfg ? activeIndicesByPhase[fase]?.has(cfg.match_index) : false
        
        if (cfg && isActive) {
           roundsMap[fase].push({
             id: `cfg-${cfg.id}`,
             p1: cfg.origen_p1 || 'Esperando...',
             p2: cfg.origen_p2 || 'Esperando...',
             isPlaceholder: true,
             bracket_index: i,
             isHidden: false
           })
        } else {
           roundsMap[fase].push({
             id: `hidden-cfg-${fase}-${i}`,
             bracket_index: i,
             isHidden: true
           })
        }
      }
    })

    return phases.map((fase) => ({ title: fase, matches: roundsMap[fase] }))
  }

  return []
}


// Utilidad para mostrar el score correctamente alineado P1 vs P2, 
// revirtiendo el string si el profe lo tipeó desde la perspectiva del ganador pero el ganador era P2
function formatResultStr(m: any) {
  if (!Array.isArray(m.resultado)) return 'Finalizado'
  
  let s1 = 0, s2 = 0
  m.resultado.forEach((set: any) => {
    if (set.isSuper) return
    if (set.p1 > set.p2) s1++
    else if (set.p2 > set.p1) s2++
  })
  
  let isBackwards = 
    (m.ganador_id === m.p2?.id && s1 > s2) ||
    (m.ganador_id === m.p1?.id && s2 > s1)

  // Si los sets están empatados (ej: 1-1), usar el STB para detectar si está invertido
  if (!isBackwards && s1 === s2) {
    const stb = m.resultado.find((s: any) => s.isSuper)
    if (stb) {
      isBackwards =
        (m.ganador_id === m.p2?.id && stb.p1 > stb.p2) ||
        (m.ganador_id === m.p1?.id && stb.p2 > stb.p1)
    }
  }

  return m.resultado.map((s:any) => {
     if (s.isSuper) {
       const sp1 = isBackwards ? s.p2 : s.p1
       const sp2 = isBackwards ? s.p1 : s.p2
       return `STB ${sp1}-${sp2}`
     }
     let tp1 = s.p1; let tp2 = s.p2;
     let tb1 = s.tb1; let tb2 = s.tb2;
     if (isBackwards) {
       tp1 = s.p2; tp2 = s.p1;
       tb1 = s.tb2; tb2 = s.tb1;
     }
     if (tb1 !== undefined) return `${tp1}-${tp2}(${tb1}-${tb2})`
     return `${tp1}-${tp2}`
  }).join(' / ')
}

function formatResultArray(m: any) {
  if (!Array.isArray(m.resultado)) return []
  
  let s1 = 0, s2 = 0
  m.resultado.forEach((set: any) => {
    if (set.isSuper) return
    if (set.p1 > set.p2) s1++
    else if (set.p2 > set.p1) s2++
  })
  
  let isBackwards = 
    (m.ganador_id === m.p2?.id && s1 > s2) ||
    (m.ganador_id === m.p1?.id && s2 > s1)

  // Si los sets están empatados (ej: 1-1), usar el STB para detectar si está invertido
  if (!isBackwards && s1 === s2) {
    const stb = m.resultado.find((s: any) => s.isSuper)
    if (stb) {
      isBackwards =
        (m.ganador_id === m.p2?.id && stb.p1 > stb.p2) ||
        (m.ganador_id === m.p1?.id && stb.p2 > stb.p1)
    }
  }

  return m.resultado.map((s:any) => {
     if (s.isSuper) {
       return { s1: isBackwards ? s.p2 : s.p1, s2: isBackwards ? s.p1 : s.p2, isSuper: true }
     }
     let tp1 = s.p1; let tp2 = s.p2;
     let tb1 = s.tb1; let tb2 = s.tb2;
     if (isBackwards) {
       tp1 = s.p2; tp2 = s.p1;
       tb1 = s.tb2; tb2 = s.tb1;
     }
     return { s1: tp1, s2: tp2, tb1, tb2 }
  })
}

function ShimmerBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] overflow-hidden">
      <div
        className="h-full w-1/3 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, #22c55e, #4ade80, #22c55e, transparent)',
          animation: 'shimmer-slide 2.8s ease-in-out infinite',
        }}
      />
    </div>
  )
}

function PulseDots() {
  return (
    <div className="flex items-center justify-center gap-2 py-16">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-brand-500"
          style={{
            animation: 'dot-bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

function TorneoContent({ torneoId }: { torneoId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])

  const [zonas, setZonas] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [recentMatches, setRecentMatches] = useState<any[]>([])
  const [configLlave, setConfigLlave] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [torneoFormato, setTorneoFormato] = useState<'grupos' | 'eliminatoria'>('grupos')

  const currentCatId = searchParams.get('cat') || categories[0]?.id
  const [fase, setFase] = useState<'zonas'|'eliminatorias'|'campeones'>('zonas')
  const [showChampionCard, setShowChampionCard] = useState(false)
  const [shownChampionsCatIds, setShownChampionsCatIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadConfig() {
      const [tResult, catResult, matchResult, inscripciones, zonas, partidos, configs] = await Promise.all([
        supabase.from('torneos').select('formato').eq('id', torneoId).single(),
        supabase.from('categorias').select('id, nombre').order('nombre'),
        supabase
          .from('partidos')
          .select(`id, resultado, ganador_id,
            p1:participantes!participante_1_id(id, nombre_mostrado),
            p2:participantes!participante_2_id(id, nombre_mostrado),
            categorias(nombre)
          `)
          .eq('torneo_id', torneoId)
          .eq('estado', 'finalizado')
          .not('resultado', 'is', null)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(5),
        supabase.from('inscripciones').select('categoria_id').eq('torneo_id', torneoId),
        supabase.from('zonas').select('categoria_id').eq('torneo_id', torneoId),
        supabase.from('partidos').select('categoria_id').eq('torneo_id', torneoId),
        supabase.from('configuracion_llave').select('categoria_id').eq('torneo_id', torneoId)
      ])

      if (tResult.data?.formato === 'eliminatoria') {
        setTorneoFormato('eliminatoria')
        setFase('eliminatorias')
      }

      if (catResult.data) {
        // Collect all category IDs that have at least some data (zonas, partidos, or llave configurations)
        const activeCatIds = new Set<string>()
        zonas.data?.forEach(z => z.categoria_id && activeCatIds.add(z.categoria_id))
        partidos.data?.forEach(p => p.categoria_id && activeCatIds.add(p.categoria_id))
        configs.data?.forEach(c => c.categoria_id && activeCatIds.add(c.categoria_id))

        // Filter categories: keep only active ones that have actual tournament structure
        const activeCategories = catResult.data.filter(c => activeCatIds.has(c.id))
        
        // Showing only categories with generated groups or brackets
        setCategories(activeCategories.map(d => ({ id: d.id, name: d.nombre })))
      }
      if (matchResult.data) setRecentMatches(matchResult.data)
    }
    loadConfig()
  }, [torneoId])

  useEffect(() => {
    if (!currentCatId) return
    async function loadCategoryData() {
      setLoading(true)
      
      const { data: zs } = await supabase
        .from('zonas')
        .select(`
          id, nombre,
          participantes_zonas ( participante_id, participantes(id, nombre_mostrado) )
        `)
        .eq('torneo_id', torneoId)
        .eq('categoria_id', currentCatId)
        .order('nombre')
        
      const { data: ms } = await supabase
        .from('partidos')
        .select(`
          id, estado, resultado, zona_id, fase_bracket, bracket_index, fecha_hora, ganador_id, categoria_id, siguiente_partido_id, posicion_siguiente_partido,
          p1:participantes!participante_1_id(id, nombre_mostrado),
          p2:participantes!participante_2_id(id, nombre_mostrado),
          sedes(nombre)
        `)
        .eq('torneo_id', torneoId)

      const { data: cfgLlave } = await supabase
        .from('configuracion_llave')
        .select('*')
        .eq('torneo_id', torneoId)
        .eq('categoria_id', currentCatId)
        .order('fase')
        .order('match_index')
      
      const validZoneIds = zs ? zs.map(z => z.id) : []
      const filteredMs = (ms || []).filter(m => {
        return m.categoria_id === currentCatId || validZoneIds.includes(m.zona_id) || (!m.categoria_id && !m.zona_id)
      })

      if (zs) setZonas(zs)
      if (filteredMs) setMatches(filteredMs)
      setConfigLlave(cfgLlave || [])
      
      setLoading(false)
    }
    loadCategoryData()
  }, [currentCatId, torneoId])

  // === REALTIME: Suscripción a cambios en partidos para actualización en vivo ===
  useEffect(() => {
    if (!torneoId) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(`torneo-partidos-${torneoId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partidos',
            filter: `torneo_id=eq.${torneoId}`,
          },
          async () => {
            // Refrescar los datos de la categoría actual
            if (currentCatId) {
              const [zonasRes, msRes, cfgRes] = await Promise.all([
                supabase
                  .from('zonas')
                  .select(`id, nombre, participantes_zonas ( participante_id, participantes(id, nombre_mostrado) )`)
                  .eq('torneo_id', torneoId)
                  .eq('categoria_id', currentCatId)
                  .order('nombre'),
                supabase
                  .from('partidos')
                  .select(`id, estado, resultado, zona_id, fase_bracket, bracket_index, fecha_hora, ganador_id, categoria_id, siguiente_partido_id, posicion_siguiente_partido,
                    p1:participantes!participante_1_id(id, nombre_mostrado),
                    p2:participantes!participante_2_id(id, nombre_mostrado),
                    sedes(nombre)`)
                  .eq('torneo_id', torneoId),
                supabase
                  .from('configuracion_llave')
                  .select('*')
                  .eq('torneo_id', torneoId)
                  .eq('categoria_id', currentCatId)
                  .order('fase')
                  .order('match_index'),
              ])

              if (zonasRes.data) setZonas(zonasRes.data)
              if (msRes.data) {
                const validZoneIds = zonasRes.data ? zonasRes.data.map(z => z.id) : []
                const filtered = msRes.data.filter(m =>
                  m.categoria_id === currentCatId || validZoneIds.includes(m.zona_id) || (!m.categoria_id && !m.zona_id)
                )
                setMatches(filtered)
              }
              if (cfgRes.data) setConfigLlave(cfgRes.data)
            }

            // Refrescar últimos resultados
            const { data: recentData } = await supabase
              .from('partidos')
              .select(`id, resultado, ganador_id,
                p1:participantes!participante_1_id(id, nombre_mostrado),
                p2:participantes!participante_2_id(id, nombre_mostrado),
                categorias(nombre)`)
              .eq('torneo_id', torneoId)
              .eq('estado', 'finalizado')
              .not('resultado', 'is', null)
              .order('updated_at', { ascending: false, nullsFirst: false })
              .limit(5)

            if (recentData) setRecentMatches(recentData)
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] No se pudo conectar al canal en vivo. Los datos se actualizarán al recargar la página.')
          }
        })
    } catch {
      console.warn('[Realtime] Error al inicializar la suscripción. El modo manual sigue activo.')
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [torneoId, currentCatId, supabase])

  const roundData = useMemo(() => buildBracket(matches, configLlave), [matches, configLlave])
  const zonaMatchesLookup = matches.filter(m => m.zona_id && (!m.fase_bracket || m.fase_bracket === 'Fase de Grupos'))

  const finalMatch = matches.find(m => m.fase_bracket === 'Final' && m.estado === 'finalizado' && m.ganador_id && m.categoria_id === currentCatId)
  const championName = finalMatch ? (finalMatch.ganador_id === finalMatch.p1?.id ? finalMatch.p1?.nombre_mostrado : (finalMatch.ganador_id === finalMatch.p2?.id ? finalMatch.p2?.nombre_mostrado : null)) : null

  useEffect(() => {
    if (fase === 'eliminatorias' && championName && currentCatId && !shownChampionsCatIds.has(currentCatId)) {
       setShowChampionCard(true)
       setShownChampionsCatIds(prev => new Set(prev).add(currentCatId))
    }
  }, [fase, championName, currentCatId, shownChampionsCatIds])

  useEffect(() => {
    if (!showChampionCard) return
    const duration = 3500
    const end = Date.now() + duration
    let rafId: number

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: ['#fbbf24', '#f59e0b', '#fb923c', '#eab308'], zIndex: 1000 })
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: ['#fbbf24', '#f59e0b', '#fb923c', '#eab308'], zIndex: 1000 })
      if (Date.now() < end) rafId = requestAnimationFrame(frame)
    }
    const timerId = setTimeout(() => { rafId = requestAnimationFrame(frame) }, 300)

    return () => {
      clearTimeout(timerId)
      cancelAnimationFrame(rafId)
    }
  }, [showChampionCard])

  const handleTabClick = (catId: string) => {
    startTransition(() => {
      router.push(`?cat=${catId}`, { scroll: false })
    })
  }

  if (categories.length === 0) {
    return (
      <>
        <ShimmerBar />
        <PulseDots />
      </>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <AnimatePresence>
        {showChampionCard && championName && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="relative shadow-2xl flex flex-col max-w-sm w-full mx-4"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-brand-500 to-amber-400 rounded-[2.5rem] blur-xl opacity-60 animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-brand-500 to-amber-400 rounded-[2rem] blur-md opacity-80 animate-pulse" />
              <div className="relative bg-surface p-1 rounded-[2rem] shadow-2xl">
                 <div className="relative bg-surface-card border border-surface-border/50 p-8 md:p-12 w-full rounded-[calc(2rem-4px)] flex flex-col items-center text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                    <Trophy size={80} strokeWidth={1} className="text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] mb-6 animate-bounce" />
                    <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-2 relative z-10">¡Tenemos un Campeón!</h2>
                    <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent drop-shadow-sm mb-8 relative z-10 leading-tight">
                      {championName}
                    </p>
                    <button 
                      onClick={() => setShowChampionCard(false)}
                      className="px-8 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold tracking-widest uppercase text-sm transition-all hover:scale-105 active:scale-95 shadow-lg relative z-10"
                    >
                      Ver el Cuadro
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* TICKER DE ULTIMOS RESULTADOS */}
      {recentMatches.length > 0 && (
        <div className="mb-6 px-4">
          <div className="bg-surface-card border border-surface-border rounded-xl p-3 flex flex-col gap-3 overflow-hidden shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-widest px-2">
               <Activity size={14} className="animate-pulse" />
               Últimos Resultados
            </div>
            <div className="flex overflow-x-auto custom-scrollbar w-full pb-2 px-2">
              {recentMatches.map((m, idx) => {
                const sets = formatResultArray(m)
                const isP1Winner = m.ganador_id === m.p1?.id
                const isP2Winner = m.ganador_id === m.p2?.id
                return (
                  <div key={m.id} className="flex shrink-0">
                    <div className="flex flex-col min-w-fit px-4 py-1 justify-center">
                      <div className="grid grid-cols-[140px_auto] sm:grid-cols-[170px_auto] gap-x-4 gap-y-1.5 items-center">
                        <div className={`text-sm truncate ${isP1Winner ? 'text-brand-300 font-bold' : 'text-slate-500'}`} title={m.p1?.nombre_mostrado}>
                          {m.p1?.nombre_mostrado} {isP1Winner && '🏆'}
                        </div>
                        <div className={`flex gap-2.5 font-mono text-sm items-center ${isP1Winner ? 'text-brand-300 font-bold' : 'text-slate-500'}`}>
                          {sets.filter((s: any) => !s.isSuper).map((s: any, i: number) => <span key={i} className="w-5 text-center flex-shrink-0">{s.s1}{s.tb1 !== undefined ? <sup className="text-[9px] ml-0.5">{s.tb1}</sup> : ''}</span>)}
                          {(() => { const st = sets.find((s: any) => s.isSuper); return st ? (
                            <div className="relative flex justify-center flex-shrink-0 min-w-[24px]">
                              <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-widest text-amber-500 font-sans leading-none">STB</span>
                              <span>{st.s1}</span>
                            </div>
                          ) : null })()}
                        </div>
                        <div className={`text-sm truncate ${isP2Winner ? 'text-brand-300 font-bold' : 'text-slate-500'}`} title={m.p2?.nombre_mostrado}>
                          {m.p2?.nombre_mostrado} {isP2Winner && '🏆'}
                        </div>
                        <div className={`flex gap-2.5 font-mono text-sm ${isP2Winner ? 'text-brand-300 font-bold' : 'text-slate-500'}`}>
                          {sets.filter((s: any) => !s.isSuper).map((s: any, i: number) => <span key={i} className="w-5 text-center flex-shrink-0">{s.s2}{s.tb2 !== undefined ? <sup className="text-[9px] ml-0.5">{s.tb2}</sup> : ''}</span>)}
                          {(() => { const st = sets.find((s: any) => s.isSuper); return st ? <span className="w-6 text-center flex-shrink-0">{st.s2}</span> : null })()}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600 font-semibold mt-2">{m.categorias?.nombre}</span>
                    </div>
                    {idx < recentMatches.length - 1 && (
                      <div className="w-px self-stretch my-2 mx-1 bg-gradient-to-b from-transparent via-surface-border to-transparent" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <CategoryTabs categories={categories} onTabClick={handleTabClick} />

      <div className="flex justify-center gap-4 mt-6 mb-2">
        {torneoFormato !== 'eliminatoria' && (
          <button onClick={() => startTransition(() => setFase('zonas'))} className={`text-xs font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${fase === 'zonas' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Fase de Grupos</button>
        )}
        <button onClick={() => startTransition(() => setFase('eliminatorias'))} className={`text-xs font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${fase === 'eliminatorias' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Eliminatorias</button>
      </div>
      
      <div className="mt-6 px-4 min-h-[480px]">
        {(loading || isPending) && <ShimmerBar />}
        {(loading || isPending) ? (
          <PulseDots />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCatId + fase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full flex justify-center"
            >
              
              {/* VISTA DE ELIMINATORIAS */}
              {fase === 'eliminatorias' && (
                roundData.length > 0
                  ? (
                    <div className="w-full">
                      {configLlave.length > 0 && !matches.some(m => m.fase_bracket && m.fase_bracket !== 'Fase de Grupos') && (
                        <div className="flex items-center gap-2 mb-4 px-1 text-xs text-amber-500/80">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />
                          Los cruces son preliminares. Los nombres reales se asignarán al finalizar todas las zonas.
                        </div>
                      )}
                      <TournamentBracket rounds={roundData} />
                    </div>
                  )
                  : <div className="text-slate-500 mt-10">Todavía no hay llaves configuradas para esta categoría.</div>
              )}

              {/* VISTA DE ZONAS — solo para formato grupos */}
              {fase === 'zonas' && torneoFormato !== 'eliminatoria' && (
                zonas.length > 0 ? (
                  <div className="w-full grid md:grid-cols-2 gap-8">
                    {zonas.map(z => {
                      const zMatches = zonaMatchesLookup.filter(m => m.zona_id === z.id)
                      const standings = calculateStandings(z.participantes_zonas || [], zMatches)
                      
                      return (
                        <div key={z.id} className="bg-surface-card border border-surface-border rounded-xl shadow-lg overflow-hidden flex flex-col">
                          <div className="bg-slate-900/40 px-5 py-3 border-b border-surface-border flex justify-between items-center">
                            <h3 className="font-bold text-brand-400 text-lg">{z.nombre}</h3>
                          </div>
                          
                          {/* TABLA DE POSICIONES */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-[10px] uppercase text-slate-500 bg-surface/30">
                                <tr>
                                  <th className="px-4 py-2 font-semibold">Jugador</th>
                                  <th className="px-2 py-2 font-semibold text-center" title="Partidos Jugados">PJ</th>
                                  <th className="px-2 py-2 font-semibold text-center text-green-400/70" title="Partidos Ganados">PG</th>
                                  <th className="px-2 py-2 font-semibold text-center text-red-400/70" title="Partidos Perdidos">PP</th>
                                  <th className="px-2 py-2 font-semibold text-center" title="Diferencia de Sets">DS</th>
                                  <th className="px-4 py-2 font-bold text-center text-brand-400">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-border/50">
                                {standings.map((row, i) => (
                                  <tr key={row.id} className="hover:bg-surface-hover/30 transition-colors">
                                    <td className="px-4 py-2.5 font-medium text-slate-200">
                                      {i===0 && <span className="w-1.5 h-1.5 inline-block bg-brand-500 rounded-full mr-2" title="Líder actual"></span>}
                                      {row.nombre}
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-slate-400">{row.pj}</td>
                                    <td className="px-2 py-2.5 text-center text-slate-400">{row.pg}</td>
                                    <td className="px-2 py-2.5 text-center text-slate-400">{row.pp}</td>
                                    <td className="px-2 py-2.5 text-center text-slate-400">{row.ds > 0 ? '+'+row.ds : row.ds}</td>
                                    <td className="px-4 py-2.5 text-center font-bold text-brand-300 bg-brand-500/5">{row.puntos}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* PARTIDOS DE LA ZONA */}
                          {zMatches.length > 0 && (
                            <div className="bg-surface/50 p-4 border-t border-surface-border flex-1">
                              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3 flex items-center gap-1.5">
                                <Calendar size={12} /> Fixture
                              </p>
                              <div className="space-y-2">
                                {zMatches.map(m => (
                                  <div key={m.id} className="text-xs bg-surface-card border border-surface-border border-l-2 border-l-brand-600 rounded p-2.5 flex justify-between items-center shadow-sm">
                                    <div className="flex flex-col gap-0.5">
                                      <span className={m.ganador_id === m.p1?.id ? 'font-bold text-brand-300' : 'text-slate-300'}>
                                        {m.p1?.nombre_mostrado} {m.ganador_id === m.p1?.id && '🏆'}
                                      </span>
                                      <span className={m.ganador_id === m.p2?.id ? 'font-bold text-brand-300' : 'text-slate-300'}>
                                        {m.p2?.nombre_mostrado} {m.ganador_id === m.p2?.id && '🏆'}
                                      </span>
                                    </div>
                                    
                                    <div className="text-right pl-3 shrink-0 flex flex-col items-end gap-1">
                                      {m.estado === 'finalizado' ? (
                                        <span className="font-mono text-[11px] bg-surface px-1.5 py-0.5 border border-surface-border rounded text-slate-300">
                                          {formatResultStr(m)}
                                        </span>
                                      ) : (
                                        <>
                                          <span className="text-[9px] uppercase font-bold text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">Pendiente</span>
                                          {m.fecha_hora && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                              🕐 {new Date(m.fecha_hora).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                          {m.sedes?.nombre && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                              📍 {m.sedes.nombre}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : <div className="text-slate-500 mt-10">Ninguna zona configurada.</div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default function TorneoClientView({ torneoId }: { torneoId: string }) {
  return (
    <Suspense fallback={<><ShimmerBar /><PulseDots /></>}>
      <TorneoContent torneoId={torneoId} />
    </Suspense>
  )
}
