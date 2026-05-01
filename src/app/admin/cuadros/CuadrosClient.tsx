'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, Loader2, Calendar, AlertCircle, Zap, CheckCircle2, Swords, Trash2, Edit2, GitBranch } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  userId: string
}

export default function CuadrosWorkspace({ userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)

  const [torneos, setTorneos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [torneoActivo, setTorneoActivo] = useState<string>('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('')

  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [zonas, setZonas] = useState<any[]>([])
  const [participantesZonificados, setParticipantesZonificados] = useState<any[]>([])
  const [partidosZona, setPartidosZona] = useState<any[]>([])


  const [nuevaZonaName, setNuevaZonaName] = useState('')
  const [sedes, setSedes] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [zonaScheduling, setZonaScheduling] = useState<{ zona: any, jugadores: any[] } | null>(null)
  const [matchForm, setMatchForm] = useState({ id: '', p1: '', p2: '', fechaHora: '', sedeId: '', fase: 'Fase de Grupos' })
  const [isSavingMatch, setIsSavingMatch] = useState(false)
  const [playoffsGenerados, setPlayoffsGenerados] = useState(false)
  const [isGeneratingCruces, setIsGeneratingCruces] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Knockout-specific state
  const [knockoutForm, setKnockoutForm] = useState({ id: '', p1: '', p2: '', fase: '32avos de Final', fechaHora: '', sedeId: '' })
  const [isSavingKnockout, setIsSavingKnockout] = useState(false)
  const [knockoutMatches, setKnockoutMatches] = useState<any[]>([])

  const torneoFormato: 'grupos' | 'eliminatoria' = (() => {
    const t = torneos.find(t => t.id === torneoActivo)
    return t?.formato === 'eliminatoria' ? 'eliminatoria' : 'grupos'
  })()

  useEffect(() => {
    if (!userId) return
    async function init() {
      // Solo torneos de este admin
      const { data: ts } = await supabase
        .from('torneos')
        .select('*')
        .eq('estado', 'En curso')
        .eq('admin_id', userId)

      if (ts && ts.length > 0) {
        setTorneos(ts)
        setTorneoActivo(ts[0].id)
      } else {
        setTorneos([])
        setLoading(false)
      }

      const { data: cs } = await supabase.from('categorias').select('*')
      if (cs && cs.length > 0) {
        setCategorias(cs)
        setCategoriaActiva(cs[0].id)
      }

      const { data: sds } = await supabase.from('sedes').select('*')
      if (sds) setSedes(sds)
    }
    init()
  }, [userId])

  useEffect(() => {
    if (torneoActivo && categoriaActiva) loadWorkspace(torneoActivo, categoriaActiva)
  }, [torneoActivo, categoriaActiva])

  const loadWorkspace = async (tId: string, cId: string, showLoader = true) => {
    if (showLoader) setLoading(true)

    const { data: ins } = await supabase
      .from('inscripciones')
      .select('id, participante_id, participantes(id, nombre_mostrado, nombre, apellido)')
      .eq('torneo_id', tId)
      .eq('categoria_id', cId)

    const { data: zs } = await supabase
      .from('zonas')
      .select('*')
      .eq('torneo_id', tId)
      .eq('categoria_id', cId)
      .order('created_at', { ascending: true })

    const zoneIds = zs ? zs.map(z => z.id) : []
    let pZonasData: any[] = []
    if (zoneIds.length > 0) {
      const { data: pz } = await supabase.from('participantes_zonas').select('*').in('zona_id', zoneIds)
      pZonasData = pz || []
    }

    let pZonasPartidos: any[] = []
    if (zoneIds.length > 0) {
      const { data: pt } = await supabase
        .from('partidos')
        .select(`id, zona_id, fecha_hora, fase_bracket, sede_id, estado, participante_1_id, participante_2_id,
          p1:participantes!participante_1_id(nombre_mostrado),
          p2:participantes!participante_2_id(nombre_mostrado)
        `)
        .in('zona_id', zoneIds)
      pZonasPartidos = pt || []
    }

    const { count: countPlayoffs } = await supabase
      .from('partidos')
      .select('id', { count: 'exact', head: true })
      .eq('torneo_id', tId)
      .eq('categoria_id', cId)
      .not('fase_bracket', 'is', null)
      .neq('fase_bracket', 'Fase de Grupos')

    const { data: km } = await supabase
      .from('partidos')
      .select(`id, fase_bracket, bracket_index, fecha_hora, sede_id, estado, participante_1_id, participante_2_id, ganador_id,
        p1:participantes!participante_1_id(nombre_mostrado),
        p2:participantes!participante_2_id(nombre_mostrado),
        sedes(nombre)
      `)
      .eq('torneo_id', tId)
      .eq('categoria_id', cId)
      .not('fase_bracket', 'is', null)
      .neq('fase_bracket', 'Fase de Grupos')


    setInscripciones((ins || []).filter((i: any) => i.participantes))
    setZonas(zs || [])
    setParticipantesZonificados(pZonasData)
    setPartidosZona(pZonasPartidos)
    setPlayoffsGenerados((countPlayoffs ?? 0) > 0)
    setKnockoutMatches(km || [])
    setLoading(false)
  }

  const assignedSet = useMemo(
    () => new Set(participantesZonificados.map(p => p.participante_id)),
    [participantesZonificados]
  )
  const jugadoresSueltos = useMemo(
    () => inscripciones.filter(ins => !assignedSet.has(ins.participante_id)),
    [inscripciones, assignedSet]
  )

  const handleCreateZona = async () => {
    if (!nuevaZonaName.trim()) return
    const { data } = await supabase
      .from('zonas')
      .insert({ nombre: nuevaZonaName, torneo_id: torneoActivo, categoria_id: categoriaActiva })
      .select('*').single()
    if (data) { setZonas([...zonas, data]); setNuevaZonaName('') }
  }

  const handleAssignToZone = async (zonaId: string, participante: any) => {
    const pId = participante.participantes.id
    // Optimistic: move player immediately from available to zone
    const tempId = 'temp-' + Date.now()
    setParticipantesZonificados(prev => [...prev, { id: tempId, zona_id: zonaId, participante_id: pId }])

    const { data, error } = await supabase
      .from('participantes_zonas')
      .insert({ zona_id: zonaId, participante_id: pId })
      .select('*')
      .single()

    if (error) {
      alert('Error asignando jugador: ' + error.message)
      // Rollback
      setParticipantesZonificados(prev => prev.filter(pz => pz.id !== tempId))
    } else if (data) {
      // Replace temp entry with real server entry
      setParticipantesZonificados(prev => prev.map(pz => pz.id === tempId ? data : pz))
    }
  }

  const handleRemoveFromZone = async (zonaId: string, participanteId: string) => {
    // Optimistic removal — instant UI feedback
    setParticipantesZonificados(prev => prev.filter(pz => !(pz.zona_id === zonaId && pz.participante_id === participanteId)))
    setPartidosZona(prev => prev.filter(p =>
      !(p.zona_id === zonaId && (p.p1_id === participanteId || p.p2_id === participanteId))
    ))

    await supabase.from('partidos').delete()
      .eq('zona_id', zonaId)
      .or(`participante_1_id.eq.${participanteId},participante_2_id.eq.${participanteId}`)
    const { error } = await supabase.from('participantes_zonas').delete().match({ zona_id: zonaId, participante_id: participanteId })

    if (error) alert('Error quitando jugador: ' + error.message)
  }

  const handleCreateMatch = async () => {
    if (!matchForm.p1 || !matchForm.p2) return alert('Seleccioná los 2 jugadores.')
    if (matchForm.p1 === matchForm.p2) return alert('El jugador 1 y el jugador 2 no pueden ser el mismo.')
    setIsSavingMatch(true)
    const payload = {
      torneo_id: torneoActivo,
      categoria_id: categoriaActiva,
      zona_id: zonaScheduling?.zona.id,
      participante_1_id: matchForm.p1,
      participante_2_id: matchForm.p2,
      fase_bracket: matchForm.fase,
      fecha_hora: matchForm.fechaHora ? new Date(matchForm.fechaHora).toISOString() : null,
      sede_id: matchForm.sedeId || null,
      estado: 'pendiente'
    }
    if (matchForm.id) {
      const { error } = await supabase.from('partidos').update(payload).eq('id', matchForm.id)
      if (error) alert('Error al editar partido: ' + error.message)
    } else {
      const { error } = await supabase.from('partidos').insert(payload)
      if (error) alert('Error al programar partido: ' + error.message)
    }
    setMatchForm({ id: '', p1: '', p2: '', fechaHora: '', sedeId: '', fase: 'Fase de Grupos' })
    setIsModalOpen(false)
    setIsSavingMatch(false)
    // Reload to get fresh partido data with participant names
    loadWorkspace(torneoActivo, categoriaActiva, false)
  }

  const handleRemoveMatch = async (matchId: string) => {
    if (!confirm('¿Eliminar este partido de la zona?')) return
    // Optimistic match removal
    setPartidosZona(prev => prev.filter(p => p.id !== matchId))
    const { error } = await supabase.from('partidos').delete().eq('id', matchId)
    if (error) {
      alert('Error borrando partido: ' + error.message)
      loadWorkspace(torneoActivo, categoriaActiva, false)
    }
  }

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, type })
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const handleGenerarCruces = async () => {
    if (zonas.length === 0) return showToast('No hay zonas creadas para generar cruces.', 'error')
    setIsGeneratingCruces(true)

    // Fetch existing zona matches to ensure idempotency
    const zoneIds = zonas.map(z => z.id)
    const { data: existingMatches } = await supabase
      .from('partidos')
      .select('participante_1_id, participante_2_id, zona_id')
      .in('zona_id', zoneIds)

    const existingSet = new Set(
      (existingMatches || []).map(m => {
        const [a, b] = [m.participante_1_id, m.participante_2_id].sort()
        return `${m.zona_id}:${a}:${b}`
      })
    )

    const torneoActual = torneos.find(t => t.id === torneoActivo)
    const defaultSede = torneoActual?.sede_id || null

    const newMatches: any[] = []

    for (const zona of zonas) {
      const jugadoresDeZona = participantesZonificados
        .filter(pz => pz.zona_id === zona.id)
        .map(pz => pz.participante_id)

      for (let i = 0; i < jugadoresDeZona.length; i++) {
        for (let j = i + 1; j < jugadoresDeZona.length; j++) {
          const p1 = jugadoresDeZona[i]
          const p2 = jugadoresDeZona[j]
          const key = `${zona.id}:${[p1, p2].sort().join(':')}`
          if (!existingSet.has(key)) {
            newMatches.push({
              torneo_id: torneoActivo,
              categoria_id: categoriaActiva,
              zona_id: zona.id,
              participante_1_id: p1,
              participante_2_id: p2,
              fase_bracket: 'Fase de Grupos',
              estado: 'pendiente',
              sede_id: defaultSede,
            })
          }
        }
      }
    }

    if (newMatches.length === 0) {
      setIsGeneratingCruces(false)
      return showToast('Todos los cruces ya existen. No se crearon partidos nuevos.', 'success')
    }

    const { error } = await supabase.from('partidos').insert(newMatches)
    setIsGeneratingCruces(false)

    if (error) {
      showToast('Error al generar cruces: ' + error.message, 'error')
    } else {
      showToast(`Se generaron ${newMatches.length} partidos nuevos con éxito.`, 'success')
      loadWorkspace(torneoActivo, categoriaActiva, false)
    }
  }

  const handleGenerarRestoBracket = async () => {
      // 1. Agrupar para encontrar la fase MÁS AVANZADA
      const matchesByFase = knockoutMatches.reduce((acc, m) => {
        acc[m.fase_bracket] = (acc[m.fase_bracket] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      let faseBase = ''
      let maxIdx = -1
      Object.keys(matchesByFase).forEach(f => {
        const idx = KNOCKOUT_FASES.indexOf(f)
        if (idx !== -1 && idx > maxIdx) {
          maxIdx = idx
          faseBase = f
        }
      })

      if (!faseBase) return showToast('No hay partidos base para generar el cuadro.', 'error')

      setIsGeneratingCruces(true)

      const baseMatches = knockoutMatches
        .filter(m => m.fase_bracket === faseBase)
        .sort((a, b) => (a.bracket_index || 0) - (b.bracket_index || 0))

      const { data: torneoData } = await supabase.from('torneos').select('sede_id').eq('id', torneoActivo).single()
      const defaultSede = torneoData?.sede_id || null

      const treeLevels: { [faseIndex: number]: any[] } = {}
      treeLevels[maxIdx] = baseMatches

      const newPartidosInsert: any[] = []
      const pendingUpdates: { id: string; siguiente: string; pos: number }[] = []

      // 2. Generar niveles faltantes usando potencias de 2 a partir de la FASE MÁS AVANZADA
      for (let fIdx = maxIdx + 1; fIdx < KNOCKOUT_FASES.length; fIdx++) {
        const faseName = KNOCKOUT_FASES[fIdx]
        // En lugar de forzar potencias desde el inicio, calculamos el count en base a los cuartos que hayan:
        // Si el usuario armó 4 cuartos, semis serán 2. Si armó 2 cuartos, semis será 1.
        const currentMatchCount = treeLevels[fIdx - 1].length
        if (currentMatchCount <= 1) break // Ya no se puede generar más

        const count = Math.ceil(currentMatchCount / 2)
        const levelMatches = []

        for (let i = 0; i < count; i++) {
          const id = crypto.randomUUID()
          const newMatch = {
            id,
            torneo_id: torneoActivo,
            categoria_id: categoriaActiva,
            fase_bracket: faseName,
            bracket_index: i, // index secuencial dentro de esta rama
            participante_1_id: null as string | null,
            participante_2_id: null as string | null,
            siguiente_partido_id: null as string | null,
            posicion_siguiente_partido: null as number | null,
            sede_id: defaultSede,
            estado: 'pendiente'
          }
          levelMatches.push(newMatch)
          newPartidosInsert.push(newMatch)
        }
        treeLevels[fIdx] = levelMatches
      }

      // 3. Conectar matemáticamente todo el árbol (hacia el futuro)
      const phasesToConnect = Object.keys(treeLevels).map(Number).sort((a, b) => a - b)

      for (let k = 0; k < phasesToConnect.length - 1; k++) {
        const fIdx = phasesToConnect[k]
        const currentLevel = treeLevels[fIdx]
        const nextLevel = treeLevels[phasesToConnect[k + 1]]

        for (let i = 0; i < currentLevel.length; i++) {
          const match = currentLevel[i]
          const nextMatchIdx = Math.floor(i / 2)
          const pos = (i % 2) === 0 ? 1 : 2

          if (nextLevel && nextLevel[nextMatchIdx]) {
            const target = nextLevel[nextMatchIdx]

            if (fIdx === maxIdx) {
              // Partidos base (ya en DB)
              pendingUpdates.push({ id: match.id, siguiente: target.id, pos })

              // Auto-avanzar si ya hay ganador
              if (match.estado === 'finalizado' && match.ganador_id) {
                if (pos === 1) target.participante_1_id = match.ganador_id
                else target.participante_2_id = match.ganador_id
              }
            } else {
              // Partidos nuevos (aún no en DB)
              match.siguiente_partido_id = target.id
              match.posicion_siguiente_partido = pos
              // Auto-avanzar si el anterior de alguna forma pasó algo
              if (match.estado === 'finalizado' && match.ganador_id) {
                if (pos === 1) target.participante_1_id = match.ganador_id
                else target.participante_2_id = match.ganador_id
              }
            }
          }
        }
      }

      try {
        if (newPartidosInsert.length > 0) {
          const { error: insErr } = await supabase.from('partidos').insert(newPartidosInsert)
          if (insErr) {
            setIsGeneratingCruces(false)
            return showToast('Error DB al crear rondas siguientes: ' + insErr.message, 'error')
          }
        }

        if (pendingUpdates.length > 0) {
          const promises = pendingUpdates.map(upd =>
            supabase.from('partidos').update({
              siguiente_partido_id: upd.siguiente,
              posicion_siguiente_partido: upd.pos
            }).eq('id', upd.id)
          )
          await Promise.all(promises)
        }

        setIsGeneratingCruces(false)
        showToast('Llaves siguientes generadas correctamente.', 'success')
        loadWorkspace(torneoActivo, categoriaActiva, false)
      } catch (err: any) {
        setIsGeneratingCruces(false)
        showToast('Error: ' + err.message, 'error')
      }
    }

    const handleDeleteKnockoutMatch = async (id: string) => {
      if (!confirm('¿Estás seguro de eliminar este partido programado? Esto puede desenlazar fases previas.')) return

      setKnockoutMatches(prev => prev.filter(m => m.id !== id))

      // 1. Desenlazar (Romper Foreign Keys de partidos previos que apuntaban a este)
      await supabase.from('partidos')
        .update({ siguiente_partido_id: null, posicion_siguiente_partido: null })
        .eq('siguiente_partido_id', id)

      // 2. Ahora sí eliminar de forma segura
      const { error } = await supabase.from('partidos').delete().eq('id', id)
      if (error) {
        showToast('Error al eliminar el partido: ' + error.message, 'error')
        loadWorkspace(torneoActivo, categoriaActiva, false)
      } else {
        showToast('Partido eliminado.', 'success')
        loadWorkspace(torneoActivo, categoriaActiva, false)
      }
    }

    const handleSaveKnockoutMatch = async () => {
      if (!knockoutForm.p1 || !knockoutForm.p2) return showToast('Seleccioná los 2 jugadores.', 'error')
      if (knockoutForm.p1 === knockoutForm.p2) return showToast('Los jugadores no pueden ser el mismo.', 'error')
      setIsSavingKnockout(true)

      const isWinnerP1 = knockoutForm.p1.startsWith('winner_of_')
      const isWinnerP2 = knockoutForm.p2.startsWith('winner_of_')

      const p1_id = isWinnerP1 ? null : knockoutForm.p1
      const p2_id = isWinnerP2 ? null : knockoutForm.p2

      // Determine bracket index
      const phaseMatches = knockoutMatches.filter(m => m.fase_bracket === knockoutForm.fase)
      const nextBracketIndex = knockoutForm.id
        ? knockoutMatches.find(m => m.id === knockoutForm.id)?.bracket_index // Keep existing
        : (phaseMatches.length > 0 ? Math.max(...phaseMatches.map(m => m.bracket_index || 0)) + 1 : 0)

      const payload = {
        torneo_id: torneoActivo,
        categoria_id: categoriaActiva,
        zona_id: null,
        participante_1_id: p1_id,
        participante_2_id: p2_id,
        fase_bracket: knockoutForm.fase,
        bracket_index: nextBracketIndex,
        fecha_hora: knockoutForm.fechaHora ? new Date(knockoutForm.fechaHora).toISOString() : null,
        sede_id: knockoutForm.sedeId || null,
      }

      let savedMatchId = knockoutForm.id

      if (knockoutForm.id) {
        // EDICIÓN
        const { error } = await supabase.from('partidos').update(payload).eq('id', knockoutForm.id)
        if (error) {
          setIsSavingKnockout(false)
          return showToast('Error al editar partido: ' + error.message, 'error')
        }
        showToast('Partido actualizado con éxito.')
      } else {
        // CREACIÓN
        const { data, error } = await supabase.from('partidos').insert({ ...payload, estado: 'pendiente' }).select('id').single()
        if (error) {
          setIsSavingKnockout(false)
          return showToast('Error al crear partido: ' + error.message, 'error')
        }
        savedMatchId = data.id
        showToast('Partido creado con éxito.')
      }

      // Actualizar origenes si se seleccionó "Ganador de..."
      const updates = []
      if (isWinnerP1) {
        const origenId = knockoutForm.p1.replace('winner_of_', '')
        updates.push(supabase.from('partidos').update({ siguiente_partido_id: savedMatchId, posicion_siguiente_partido: 1 }).eq('id', origenId))
      }
      if (isWinnerP2) {
        const origenId = knockoutForm.p2.replace('winner_of_', '')
        updates.push(supabase.from('partidos').update({ siguiente_partido_id: savedMatchId, posicion_siguiente_partido: 2 }).eq('id', origenId))
      }

      if (updates.length > 0) {
        await Promise.all(updates)
      }

      setIsSavingKnockout(false)
      setKnockoutForm({ id: '', p1: '', p2: '', fase: knockoutForm.fase, fechaHora: '', sedeId: '' })
      loadWorkspace(torneoActivo, categoriaActiva, false)
    }

    const handleEditKnockoutMatch = (match: any) => {
      // Si tiene 'temp-', fue creado en esta misma sesión y no se refrescó. Forzamos refresh.
      if (match.id.startsWith('temp-')) return showToast('Esperá un segundo a que se sincronice antes de editar.', 'error')

      // Identificar si p1 o p2 provienen de un partido de origen ("Ganador de...")
      const originP1 = knockoutMatches.find(m => m.siguiente_partido_id === match.id && m.posicion_siguiente_partido === 1)
      const originP2 = knockoutMatches.find(m => m.siguiente_partido_id === match.id && m.posicion_siguiente_partido === 2)

      setKnockoutForm({
        id: match.id,
        p1: originP1 ? `winner_of_${originP1.id}` : match.participante_1_id || '',
        p2: originP2 ? `winner_of_${originP2.id}` : match.participante_2_id || '',
        fase: match.fase_bracket,
        fechaHora: match.fecha_hora ? new Date(match.fecha_hora).toISOString().slice(0, 16) : '',
        sedeId: match.sede_id || ''
      })
    }



    if (!userId) return <p className="text-slate-500 text-center py-12">Sin sesión activa.</p>

    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* HEADER — condicional por formato */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            {torneoFormato === 'eliminatoria' ? (
              <>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <Swords className="text-amber-400" />
                  Generador de Fases Eliminatorias
                </h2>
                <p className="text-slate-400 text-sm mt-1">Emparejá participantes para armar el cuadro de eliminación directa.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <Users className="text-brand-500" />
                  Armado de Zonas
                </h2>
                <p className="text-slate-400 text-sm mt-1">Configuración manual de grupos para administrar agendas.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={torneoActivo} onChange={e => setTorneoActivo(e.target.value)} className="select-field py-1.5 h-10">
              {torneos.length === 0
                ? <option value="">Sin torneos activos</option>
                : torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)
              }
            </select>
            <select value={categoriaActiva} onChange={e => setCategoriaActiva(e.target.value)} className="select-field py-1.5 h-10">
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {torneoFormato === 'grupos' && !playoffsGenerados && zonas.length > 0 && (
              <button
                id="btn-generar-cruces"
                onClick={handleGenerarCruces}
                disabled={isGeneratingCruces}
                className="flex items-center gap-2 px-4 py-2 h-10 rounded-lg font-semibold text-sm
                bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                text-white shadow-lg shadow-violet-900/30 transition-all
                disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGeneratingCruces
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Zap size={16} />
                }
                Generar Cruces de Zonas
              </button>
            )}
          </div>
        </div>

        {torneos.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-surface-border rounded-3xl text-slate-500">
            <p>No tenés torneos activos. Activá uno desde "Mis Torneos".</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-500" /></div>
        ) : torneoFormato === 'eliminatoria' ? (
          <KnockoutMatchmaker
            inscripciones={inscripciones}
            knockoutMatches={knockoutMatches}
            knockoutForm={knockoutForm}
            setKnockoutForm={setKnockoutForm}
            isSavingKnockout={isSavingKnockout}
            sedes={sedes}
            onSave={handleSaveKnockoutMatch}
            onDelete={handleDeleteKnockoutMatch}
            onEdit={handleEditKnockoutMatch}
            onGenerateRest={handleGenerarRestoBracket}
            isGeneratingCruces={isGeneratingCruces}
          />
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">

            {/* COLUMNA IZQ: JUGADORES SUELTOS */}
            <div className="space-y-4">
              <div className="bg-surface border border-surface-border rounded-xl p-4 sticky top-6">
                <h3 className="font-semibold text-brand-400 mb-2 flex items-center justify-between">
                  Disponibles
                  <span className="bg-surface-border text-slate-300 px-2 py-0.5 rounded text-xs">{jugadoresSueltos.length} restantes</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">Click en el menú del jugador para asignarlo a una zona.</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 pb-12 custom-scrollbar">
                  {jugadoresSueltos.length === 0 ? (
                    <div className="text-center p-4 border border-dashed border-surface-border rounded-lg text-slate-500 text-sm">
                      No hay jugadores pendientes
                    </div>
                  ) : (
                    jugadoresSueltos.map(ins => (
                      <motion.div key={ins.id} className="bg-surface-card border border-surface-border hover:border-brand-500/50 hover:bg-brand-500/10 transition-colors rounded-lg p-2.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface border border-surface-border flex items-center justify-center text-xs font-bold text-slate-300">
                          {ins.participantes.nombre_mostrado.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-200 truncate">{ins.participantes.nombre_mostrado}</p>
                        </div>
                        {!playoffsGenerados && (
                          <div className="relative">
                            <button onClick={() => setOpenMenuId(openMenuId === ins.id ? null : ins.id)} className="text-slate-500 hover:text-brand-400 p-2 text-lg leading-none">⋮</button>
                            {openMenuId === ins.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl z-20 w-36 p-1">
                                  {zonas.length === 0
                                    ? <p className="text-[10px] p-2 text-slate-500">Creá zonas primero</p>
                                    : zonas.map(z => (
                                      <button key={z.id} onClick={() => { handleAssignToZone(z.id, ins); setOpenMenuId(null) }} className="block w-full text-left px-3 py-2 hover:bg-brand-500/20 active:bg-brand-500/30 text-xs text-slate-300 rounded">Al {z.nombre}</button>
                                    ))
                                  }
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLUMNA DER: ZONAS */}
            <div className="space-y-6">
              {playoffsGenerados && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-sm text-amber-300 mb-6">
                  <AlertCircle size={20} className="shrink-0" />
                  <p>La fase eliminatoria ya fue generada. La configuración de zonas y partidos de fase de grupos ha sido bloqueada. Si necesitás realizar cambios, primero debés eliminar TODOS los partidos eliminatorios desde la solapa "Playoffs".</p>
                </div>
              )}

              {!playoffsGenerados && (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Ej: Zona A, Round Robin 1..."
                    value={nuevaZonaName}
                    onChange={e => setNuevaZonaName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateZona()}
                    className="input-field max-w-sm"
                  />
                  <button onClick={handleCreateZona} className="btn-primary py-2 px-4 shadow-lg shadow-brand-900/20">
                    <Plus size={18} className="inline mr-1" /> Crear Zona
                  </button>
                </div>
              )}

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {zonas.map(zona => {
                  const participantesDeEstaZona = participantesZonificados.filter(pz => pz.zona_id === zona.id)
                  const jDeEstaZona = participantesDeEstaZona.map(pz => {
                    const dataInicial = inscripciones.find(ins => ins.participante_id === pz.participante_id)
                    return { pzId: pz.id, pId: pz.participante_id, ...(dataInicial?.participantes || { nombre_mostrado: 'Desconocido' }) }
                  })
                  return (
                    <div key={zona.id} className="bg-surface-card border border-surface-border rounded-xl shadow-lg relative min-h-[220px] flex flex-col">
                      <div className="px-4 py-3 border-b border-surface-border/50 flex items-center justify-between bg-surface/30 rounded-t-xl">
                        <h4 className="font-semibold text-brand-300">{zona.nombre}</h4>
                        <span className="text-xs text-slate-500">{jDeEstaZona.length} / 4</span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-2">
                        {jDeEstaZona.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-surface-border/40 rounded-lg py-4">
                            <p className="text-xs text-slate-500 font-medium">Vacía</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {jDeEstaZona.map(j => (
                              <div key={j.pId} className="flex items-center justify-between bg-surface border border-surface-border rounded p-1.5 text-xs">
                                <span className="font-medium text-slate-300 truncate pl-1">{j.nombre_mostrado}</span>
                                {!playoffsGenerados && (
                                  <button onClick={() => handleRemoveFromZone(zona.id, j.pId)} className="text-red-400 hover:text-red-300 px-2 font-bold hover:bg-red-500/10 rounded ml-2">×</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {partidosZona.filter(p => p.zona_id === zona.id).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface-border/50">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Partidos Programados</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                              {partidosZona.filter(p => p.zona_id === zona.id).map(match => (
                                <div key={match.id} className="bg-slate-900/30 border border-brand-500/20 rounded p-2 flex flex-col gap-1.5 group">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-brand-300 font-semibold">{match.p1.nombre_mostrado} vs {match.p2.nombre_mostrado}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${match.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>{match.estado}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500">
                                      {match.fecha_hora
                                        ? new Date(match.fecha_hora).toLocaleDateString() + ' ' + new Date(match.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : 'Sin fecha'}
                                    </span>
                                    <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-2">
                                      {match.estado === 'pendiente' && !playoffsGenerados && (
                                        <button className="text-[10px] text-blue-400 hover:text-blue-300" onClick={() => {
                                          setZonaScheduling({ zona, jugadores: jDeEstaZona })
                                          setMatchForm({ id: match.id, p1: match.participante_1_id, p2: match.participante_2_id, fechaHora: match.fecha_hora ? match.fecha_hora.substring(0, 16) : '', sedeId: match.sede_id || '', fase: match.fase_bracket || 'Fase de Grupos' })
                                          setIsModalOpen(true)
                                        }}>Editar</button>
                                      )}
                                      {!playoffsGenerados && (
                                        <button onClick={() => handleRemoveMatch(match.id)} className="text-[10px] text-red-400 hover:text-red-300">Borrar</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {jugadoresSueltos.length > 0 && jDeEstaZona.length < 4 && !playoffsGenerados && (
                          <div className="mt-2">
                            <select
                              className="w-full text-xs py-1.5 px-2 bg-surface border border-surface-border rounded text-slate-400 focus:text-slate-200 outline-none"
                              value=""
                              onChange={e => {
                                const selected = jugadoresSueltos.find(ins => ins.participante_id === e.target.value)
                                if (selected) handleAssignToZone(zona.id, selected)
                              }}
                            >
                              <option value="" disabled>+ Agregar jugador...</option>
                              {jugadoresSueltos.map(ins => (
                                <option key={ins.id} value={ins.participante_id}>{ins.participantes.nombre_mostrado}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-surface-border/50 bg-slate-900/20">
                        <button
                          disabled={jDeEstaZona.length < 2 || playoffsGenerados}
                          onClick={() => {
                            setZonaScheduling({ zona, jugadores: jDeEstaZona })
                            setMatchForm({ id: '', p1: '', p2: '', fechaHora: '', sedeId: '', fase: 'Fase de Grupos' })
                            setIsModalOpen(true)
                          }}
                          className="w-full text-xs py-2 bg-brand-600/10 hover:bg-brand-500 hover:text-white border border-brand-500/30 font-semibold uppercase tracking-wider rounded-lg text-brand-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Calendar size={14} className="inline mr-1" />
                          Programar Partidos
                        </button>
                      </div>
                    </div>
                  )
                })}
                {zonas.length === 0 && (
                  <div className="md:col-span-2 xl:col-span-3 text-center py-20 text-slate-500 bg-surface-card border border-surface-border border-dashed rounded-xl">
                    No creaste ninguna zona todavía. Empezá con el botón "Crear Zona".
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL */}
        <AnimatePresence>
          {isModalOpen && zonaScheduling && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-surface-border rounded-xl shadow-2xl relative z-10 w-full max-w-lg p-6 flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Calendar className="text-brand-500" /> Programar Partido</h3>
                  <p className="text-sm text-slate-400 mt-1">Para <strong className="text-slate-200">{zonaScheduling.zona.nombre}</strong>.</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Jugador 1</label>
                      <select className="input-field w-full text-sm" value={matchForm.p1} onChange={e => setMatchForm({ ...matchForm, p1: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {zonaScheduling.jugadores.map(j => <option key={j.pId} value={j.pId}>{j.nombre_mostrado}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Jugador 2</label>
                      <select className="input-field w-full text-sm" value={matchForm.p2} onChange={e => setMatchForm({ ...matchForm, p2: e.target.value })}>
                        <option value="">Seleccionar...</option>
                        {zonaScheduling.jugadores.map(j => <option key={j.pId} value={j.pId}>{j.nombre_mostrado}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Fase</label>
                    <select className="input-field w-full text-sm" value={matchForm.fase} onChange={e => setMatchForm({ ...matchForm, fase: e.target.value })}>
                      {['Fase de Grupos', '32avos de Final', '16avos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Fecha y Hora (Opcional)</label>
                      <input type="datetime-local" className="input-field w-full text-sm" value={matchForm.fechaHora} onChange={e => setMatchForm({ ...matchForm, fechaHora: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Sede (Opcional)</label>
                      <select className="input-field w-full text-sm" value={matchForm.sedeId} onChange={e => setMatchForm({ ...matchForm, sedeId: e.target.value })}>
                        <option value="">Sin definir...</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancelar</button>
                  <button onClick={handleCreateMatch} disabled={isSavingMatch} className="btn-primary py-2 px-5">
                    {isSavingMatch ? <Loader2 size={18} className="animate-spin inline" /> : 'Guardar Partido'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* TOAST */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium
              ${toast.type === 'success'
                  ? 'bg-surface border-green-500/30 text-green-300'
                  : 'bg-surface border-red-500/30 text-red-300'
                }`}
            >
              {toast.type === 'success'
                ? <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                : <AlertCircle size={18} className="text-red-400 shrink-0" />
              }
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const KNOCKOUT_FASES = ['32avos de Final', '16avos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final']

  interface KnockoutMatchmakerProps {
    inscripciones: any[]
    knockoutMatches: any[]
    knockoutForm: { id?: string; p1: string; p2: string; fase: string; fechaHora: string; sedeId: string }
    setKnockoutForm: (f: any) => void
    isSavingKnockout: boolean
    sedes: any[]
    onSave: () => void
    onDelete: (id: string) => void
    onEdit: (match: any) => void
    onGenerateRest: () => void
    isGeneratingCruces: boolean
  }

  function KnockoutMatchmaker({ inscripciones, knockoutMatches, knockoutForm, setKnockoutForm, isSavingKnockout, sedes, onSave, onDelete, onEdit, onGenerateRest, isGeneratingCruces }: KnockoutMatchmakerProps) {
    const assignedIds = new Set(knockoutMatches.flatMap(m => [m.participante_1_id, m.participante_2_id]))
    // Allow currently selected players to be freely swapped when editing
    if (knockoutForm.id) {
      assignedIds.delete(knockoutForm.p1)
      assignedIds.delete(knockoutForm.p2)
    }

    const todosJugadores = inscripciones.map(ins => ({ id: ins.participante_id, nombre: ins.participantes?.nombre_mostrado || 'Desconocido' }))
    const jugadoresLibres = todosJugadores.filter(j => !assignedIds.has(j.id))

    const [isFlashing, setIsFlashing] = useState(false)

    useEffect(() => {
      if (knockoutForm.id) {
        setIsFlashing(true)
        const timer = setTimeout(() => setIsFlashing(false), 800)
        return () => clearTimeout(timer)
      }
    }, [knockoutForm.id])

    useEffect(() => {
      // Auto-select optimal initial phase if it's currently the default
      if (todosJugadores.length > 0 && knockoutForm.fase === '32avos de Final' && knockoutMatches.length === 0) {
        const n = todosJugadores.length
        let defFase = '32avos de Final'
        if (n <= 2) defFase = 'Final'
        else if (n <= 4) defFase = 'Semifinal'
        else if (n <= 8) defFase = 'Cuartos de Final'
        else if (n <= 16) defFase = 'Octavos de Final'

        if (defFase !== knockoutForm.fase) {
          setKnockoutForm((prev: any) => ({ ...prev, fase: defFase }))
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todosJugadores.length])

    return (
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* PANEL IZQUIERDO: PARTIDOS CREADOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-300 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Swords size={15} className="text-amber-400" />
              Partidos Programados
              <span className="bg-surface-border text-slate-400 text-xs px-2 py-0.5 rounded">{knockoutMatches.length}</span>
            </h3>
            <button
              onClick={onGenerateRest}
              disabled={isGeneratingCruces || knockoutMatches.length === 0}
              className="flex items-center gap-2 text-xs bg-brand-600/20 hover:bg-brand-500 hover:text-white border border-brand-500/30 text-brand-400 px-3 py-2 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Auto-generar las fases siguientes basadas en los partidos actuales"
            >
              {isGeneratingCruces ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              Generar Llave Automática
            </button>
          </div>

          <div className="space-y-3">
            {knockoutMatches.length === 0 ? (
              <div className="border border-dashed border-surface-border rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-surface">
                Todavía no hay partidos creados para esta categoría.
              </div>
            ) : (
              knockoutMatches.map((m, i) => {
                // Buscar si este partido espera ganadores de rondas previas
                const sourceP1 = knockoutMatches.find(prev => prev.siguiente_partido_id === m.id && prev.posicion_siguiente_partido === 1)
                const sourceP2 = knockoutMatches.find(prev => prev.siguiente_partido_id === m.id && prev.posicion_siguiente_partido === 2)

                return (
                  <div key={m.id} className="group relative bg-surface border border-surface-border rounded-xl p-4 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 items-center">
                        <span className="px-2 py-0.5 bg-surface-border rounded text-[10px] font-bold text-slate-300 uppercase tracking-widest">{m.fase_bracket} - P{(m.bracket_index || 0) + 1}</span>
                        {m.sedes && <span className="text-[10px] text-slate-500 font-medium tracking-wide">Sede: {m.sedes.nombre}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {m.fecha_hora && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-surface-card px-2.5 py-1 rounded-md border border-surface-border/50">
                            <Calendar size={13} className="text-amber-500" />
                            {new Date(m.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        <button
                          onClick={() => onEdit(m)}
                          className="p-1.5 text-slate-500 hover:text-brand-400 hover:bg-brand-400/10 rounded transition-colors"
                          title="Editar partido programado"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(m.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Eliminar partido programado"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-surface-card border border-surface-border/50">
                        <span className="text-sm font-semibold text-slate-200">
                          {m.p1 ? m.p1.nombre_mostrado : sourceP1 ? <span className="text-amber-500 italic">Esperando Ganador {sourceP1.fase_bracket} P{(sourceP1.bracket_index || 0) + 1}</span> : <span className="text-slate-500 italic">Esperando rival...</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-surface-card border border-surface-border/50">
                        <span className="text-sm font-semibold text-slate-200">
                          {m.p2 ? m.p2.nombre_mostrado : sourceP2 ? <span className="text-amber-500 italic">Esperando Ganador {sourceP2.fase_bracket} P{(sourceP2.bracket_index || 0) + 1}</span> : 'Jugador 2'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO: FORMULARIO DE EMPAREJAMIENTO */}
        <div className="sticky top-6 self-start">
          <div className={`rounded-2xl p-5 space-y-5 transition-all duration-700 ease-out ${isFlashing
            ? 'bg-emerald-500/10 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.02]'
            : 'bg-surface-card border border-amber-500/20 shadow-lg shadow-amber-900/10 scale-100'
            }`}>
            <div>
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Zap size={16} className={`transition-colors duration-500 ${isFlashing ? 'text-emerald-400' : 'text-amber-400'}`} />
                {knockoutForm.id ? 'Editando Partido' : 'Crear Enfrentamiento'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Seleccioná dos participantes y la fase del torneo.</p>
            </div>

            {jugadoresLibres.length < 2 && todosJugadores.length < 2 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-surface-border rounded-xl">
                Necesitás al menos 2 participantes inscriptos.
              </div>
            ) : jugadoresLibres.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-surface-border rounded-xl">
                Todos los participantes ya tienen partido asignado.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jugador 1</label>
                    <select
                      className="input-field w-full text-sm"
                      value={knockoutForm.p1}
                      onChange={e => setKnockoutForm({ ...knockoutForm, p1: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      <optgroup label="Jugadores Libres">
                        {jugadoresLibres.filter(j => j.id !== knockoutForm.p2).map(j => (
                          <option key={j.id} value={j.id}>{j.nombre}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Ganadores de Partidos Previos">
                        {knockoutMatches.filter(m => (!m.siguiente_partido_id || m.siguiente_partido_id === knockoutForm.id) && m.id !== knockoutForm.id && `winner_of_${m.id}` !== knockoutForm.p2).map(m => (
                          <option key={`winner_of_${m.id}`} value={`winner_of_${m.id}`}>Ganador {m.fase_bracket} P{(m.bracket_index || 0) + 1}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jugador 2</label>
                    <select
                      className="input-field w-full text-sm"
                      value={knockoutForm.p2}
                      onChange={e => setKnockoutForm({ ...knockoutForm, p2: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      <optgroup label="Jugadores Libres">
                        {jugadoresLibres.filter(j => j.id !== knockoutForm.p1).map(j => (
                          <option key={j.id} value={j.id}>{j.nombre}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Ganadores de Partidos Previos">
                        {knockoutMatches.filter(m => (!m.siguiente_partido_id || m.siguiente_partido_id === knockoutForm.id) && m.id !== knockoutForm.id && `winner_of_${m.id}` !== knockoutForm.p1).map(m => (
                          <option key={`winner_of_${m.id}`} value={`winner_of_${m.id}`}>Ganador {m.fase_bracket} P{(m.bracket_index || 0) + 1}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fase</label>
                  <select
                    className="input-field w-full text-sm"
                    value={knockoutForm.fase}
                    onChange={e => setKnockoutForm({ ...knockoutForm, fase: e.target.value })}
                  >
                    {KNOCKOUT_FASES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fecha y Hora (Opcional)</label>
                  <input
                    type="datetime-local"
                    className="input-field w-full text-sm"
                    value={knockoutForm.fechaHora}
                    onChange={e => setKnockoutForm({ ...knockoutForm, fechaHora: e.target.value })}
                  />
                </div>

                {sedes.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sede (Opcional)</label>
                    <select
                      className="input-field w-full text-sm"
                      value={knockoutForm.sedeId}
                      onChange={e => setKnockoutForm({ ...knockoutForm, sedeId: e.target.value })}
                    >
                      <option value="">Sin definir...</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onSave}
                    disabled={isSavingKnockout || !knockoutForm.p1 || !knockoutForm.p2}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                    bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500
                    text-white shadow-lg shadow-amber-900/30 transition-all
                    disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {isSavingKnockout
                      ? <Loader2 size={16} className="animate-spin" />
                      : knockoutForm.id ? <CheckCircle2 size={16} /> : <Swords size={16} />
                    }
                    {knockoutForm.id ? 'Guardar Cambios' : 'Crear Partido'}
                  </button>

                  {knockoutForm.id && (
                    <button
                      onClick={() => setKnockoutForm({ id: '', p1: '', p2: '', fase: knockoutForm.fase, fechaHora: '', sedeId: '' })}
                      className="flex-none px-4 py-3 rounded-xl font-bold text-sm bg-surface-border text-slate-400 hover:text-slate-200 transition-colors"
                      title="Cancelar edición"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 bg-surface border border-surface-border rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>Participantes Inscriptos</span>
              <span className="bg-surface-border text-slate-400 px-2 py-0.5 rounded">{jugadoresLibres.length} / {todosJugadores.length}</span>
            </h4>
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {todosJugadores.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-4">Sin inscriptos en esta categoría.</p>
              ) : (
                todosJugadores.map(j => {
                  const asignado = assignedIds.has(j.id)
                  return (
                    <div key={j.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-sm transition-colors ${asignado
                      ? 'bg-surface border-surface-border/30 opacity-40'
                      : 'bg-surface-card border-surface-border/50'
                      }`}>
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${asignado ? 'bg-green-500/20 text-green-500' : 'bg-surface-border text-slate-400'
                        }`}>
                        {asignado ? '✓' : j.nombre.charAt(0)}
                      </div>
                      <span className={`truncate font-medium ${asignado ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{j.nombre}</span>
                      {asignado && <span className="ml-auto text-[10px] text-green-500/70 shrink-0">Asignado</span>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }