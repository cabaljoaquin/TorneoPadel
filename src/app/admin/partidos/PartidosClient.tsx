'use client'

import { motion, Variants } from 'framer-motion'
import { CheckCircle2, Clock, Trophy, Loader2, Search, MapPin, Pencil, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { parsePadelScore } from '@/utils/scoreParser'
import { createClient } from '@/utils/supabase/client'

interface Props {
  userId: string
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

export default function PartidosClient({ userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)
  const [torneos, setTorneos] = useState<{id: string, nombre: string}[]>([])
  const [torneosIds, setTorneosIds] = useState<string[]>([])

  const [selectedWinners, setSelectedWinners] = useState<Record<string, string>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [stInputs, setStInputs] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'pendientes' | 'finalizados'>('pendientes')
  
  const [categories, setCategories] = useState<{id: string, nombre: string}[]>([])
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterFase, setFilterFase] = useState<string>('all')
  const [filterTorneo, setFilterTorneo] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sedes, setSedes] = useState<{id: string, nombre: string}[]>([])
  const [logisticaOpen, setLogisticaOpen] = useState<string | null>(null)
  const [logisticaForm, setLogisticaForm] = useState<Record<string, { sedeId: string; fechaHora: string }>>({})
  const [savingLogistica, setSavingLogistica] = useState<string | null>(null)

  // Cargamos los IDs de torneos del admin actual al montar
  useEffect(() => {
    if (!userId) return
    async function loadTorneos() {
      const { data } = await supabase
        .from('torneos')
        .select('id, nombre')
        .eq('admin_id', userId)
        .neq('estado', 'Finalizado')
      const items = data ?? []
      setTorneos(items)
      setTorneosIds(items.map(t => t.id))
    }
    async function loadCategories() {
      const { data } = await supabase.from('categorias').select('id, nombre').order('nombre')
      if (data) setCategories(data)
    }
    async function loadSedes() {
      const { data } = await supabase.from('sedes').select('id, nombre').order('nombre')
      if (data) setSedes(data)
    }
    loadTorneos()
    loadCategories()
    loadSedes()
  }, [userId])

  const fetchMatches = async () => {
    if (!userId) return
    setLoading(true)

    // Si el admin no tiene torneos, no mostramos nada
    if (torneosIds.length === 0) {
      setMatches([])
      setLoading(false)
      return
    }

    let query = supabase
      .from('partidos')
      .select(`
        id, fecha_hora, estado, sede_id, participante_1_id, participante_2_id, ganador_id, resultado, fase_bracket,
        siguiente_partido_id, posicion_siguiente_partido, updated_at,
        sedes(nombre),
        p1:participantes!participante_1_id(id, nombre_mostrado),
        p2:participantes!participante_2_id(id, nombre_mostrado)
      `)
      // Filtramos solo partidos de torneos activos de este admin
      .in('torneo_id', filterTorneo !== 'all' ? [filterTorneo] : torneosIds)

    if (tab === 'pendientes') {
      // Ordenamos primero por fase de grupos para que se jueguen primero, y luego eliminatorias, y fecha
      query = query.eq('estado', 'pendiente').order('fecha_hora', { ascending: true, nullsFirst: false }).order('id')
    } else {
      query = query.eq('estado', 'finalizado').order('updated_at', { ascending: false, nullsFirst: false }).order('fecha_hora', { ascending: false }).limit(30)
    }

    if (filterCat !== 'all') query = query.eq('categoria_id', filterCat)

    if (filterFase === 'grupos') {
      query = query.or(`fase_bracket.eq.Fase de Grupos,fase_bracket.is.null`)
    } else if (filterFase === 'eliminatorias') {
      query = query.neq('fase_bracket', 'Fase de Grupos').not('fase_bracket', 'is', null)
    }

    const { data, error } = await query

    if (!error && data) {
      const sorted = tab === 'pendientes'
        ? [...data].sort((a, b) => {
            const aScore = (a.p1 ? 1 : 0) + (a.p2 ? 1 : 0)
            const bScore = (b.p1 ? 1 : 0) + (b.p2 ? 1 : 0)
            return bScore - aScore
          })
        : data
      setMatches(sorted)
      if (tab === 'finalizados') {
        const newInputs: Record<string, string> = {}
        const newStInputs: Record<string, string> = {}
        const newWinners: Record<string, string> = {}
        data.forEach(m => {
          if (m.ganador_id) newWinners[m.id] = m.ganador_id
          if (m.resultado && Array.isArray(m.resultado)) {
            const normalSets = m.resultado.filter((s: any) => !s.isSuper)
            const superSet = m.resultado.find((s: any) => s.isSuper)
            newInputs[m.id] = normalSets.map((s: any) => s.tb1 !== undefined ? `${s.p1}${s.p2}${s.tb1}${s.tb2}` : `${s.p1}${s.p2}`).join('')
            if (superSet) newStInputs[m.id] = `${superSet.p1}-${superSet.p2}`
          }
        })
        setInputs(newInputs)
        setStInputs(newStInputs)
        setSelectedWinners(newWinners)
      } else {
        setInputs({})
        setSelectedWinners({})
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMatches()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterCat, filterFase, filterTorneo, torneosIds.join(',')])

  const handleWinnerSelect = (matchId: string, participantId: string) => {
    setSelectedWinners(prev => ({ ...prev, [matchId]: participantId }))
  }

  const handleScoreSubmit = async (id: string) => {
    const scoreStr = inputs[id]
    const winnerId = selectedWinners[id]
    if (!winnerId) return alert('Debes seleccionar al ganador del partido primero.')
    if (!scoreStr) return alert('Debes ingresar el resultado numérico (Ej: 6475).')
    const parsedSets = parsePadelScore(scoreStr)
    if (parsedSets.length === 0) return alert('Formato de resultado inválido.')

    const stStr = stInputs[id]?.trim()
    if (stStr) {
      let stP1: number | null = null
      let stP2: number | null = null

      if (stStr.includes('-')) {
        const parts = stStr.split('-')
        stP1 = parseInt(parts[0], 10)
        stP2 = parseInt(parts[1], 10)
      } else if (stStr.includes(' ')) {
        const parts = stStr.split(' ')
        stP1 = parseInt(parts[0], 10)
        stP2 = parseInt(parts[1], 10)
      } else if (stStr.length >= 2) {
        const digits = stStr.replace(/\D/g, '')
        if (digits.length === 3) {
          if (parseInt(digits.slice(0, 2), 10) >= 10) {
            stP1 = parseInt(digits.slice(0, 2), 10)
            stP2 = parseInt(digits.slice(2), 10)
          } else {
            stP1 = parseInt(digits.slice(0, 1), 10)
            stP2 = parseInt(digits.slice(1), 10)
          }
        } else if (digits.length === 4) {
          stP1 = parseInt(digits.slice(0, 2), 10)
          stP2 = parseInt(digits.slice(2), 10)
        }
      }

      if (stP1 !== null && stP2 !== null && !isNaN(stP1) && !isNaN(stP2)) {
        parsedSets.push({ p1: stP1, p2: stP2, isSuper: true })
      } else {
        return alert('Formato de Super Tiebreak inválido. Usá el formato 10-8 ó 10 8.')
      }
    }

    // El usuario siempre ingresa ganador primero. Si el ganador es P2, swapeamos
    // p1/p2 en todos los sets (incluido STB) para que el DB siempre tenga P1/P2 real.
    const currentMatch = matches.find(m => m.id === id)
    const winnerIsP2 = currentMatch && winnerId === currentMatch.p2?.id
    if (winnerIsP2) {
      parsedSets.forEach(set => {
        const tmp = set.p1; set.p1 = set.p2; set.p2 = tmp
        if (set.tb1 !== undefined) {
          const tmpTb = set.tb1; set.tb1 = set.tb2; set.tb2 = tmpTb
        }
      })
    }



    setSavingMatchId(id)

    // 1. Update del partido actual
    const { error } = await supabase
      .from('partidos')
      .update({ 
        resultado: parsedSets, 
        estado: 'finalizado', 
        ganador_id: winnerId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)

    if (error) {
      alert('Error guardando partido: ' + error.message)
      setSavingMatchId(null)
      return
    }

    // 2. Update del partido siguiente (Lógica de Auto-Progresión)
    if (currentMatch?.siguiente_partido_id && currentMatch.posicion_siguiente_partido) {
      const updateField = currentMatch.posicion_siguiente_partido === 1 ? 'participante_1_id' : 'participante_2_id'
      
      const { error: errSiguiente } = await supabase
        .from('partidos')
        .update({ [updateField]: winnerId })
        .eq('id', currentMatch.siguiente_partido_id)
        
      if (errSiguiente) {
        console.error('Error auto-progresión:', errSiguiente)
        alert('Se guardó el resultado pero hubo un error actualizando la fase siguiente.')
      }
    }

    setSelectedWinners(prev => { const n = { ...prev }; delete n[id]; return n })
    setInputs(prev => { const n = { ...prev }; delete n[id]; return n })
    setStInputs(prev => { const n = { ...prev }; delete n[id]; return n })
    await fetchMatches()
    setSavingMatchId(null)
  }

  const openLogistica = (match: any) => {
    setLogisticaOpen(match.id)
    setLogisticaForm(prev => ({
      ...prev,
      [match.id]: {
        sedeId: match.sede_id || '',
        fechaHora: match.fecha_hora ? new Date(match.fecha_hora).toISOString().slice(0, 16) : ''
      }
    }))
  }

  const handleSaveLogistica = async (matchId: string) => {
    const form = logisticaForm[matchId]
    if (!form) return
    setSavingLogistica(matchId)
    const { error } = await supabase.from('partidos').update({
      sede_id: form.sedeId || null,
      fecha_hora: form.fechaHora ? new Date(form.fechaHora).toISOString() : null
    }).eq('id', matchId)
    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId
        ? { ...m, sede_id: form.sedeId || null,
            fecha_hora: form.fechaHora ? new Date(form.fechaHora).toISOString() : null,
            sedes: sedes.find(s => s.id === form.sedeId) ? { nombre: sedes.find(s => s.id === form.sedeId)!.nombre } : null }
        : m
      ))
      setLogisticaOpen(null)
    }
    setSavingLogistica(null)
  }

  const filteredMatches = matches.filter(m => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const p1Name = m.p1?.nombre_mostrado?.toLowerCase() || ''
    const p2Name = m.p2?.nombre_mostrado?.toLowerCase() || ''
    return p1Name.includes(term) || p2Name.includes(term)
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="text-brand-500" />
            Carga de Resultados
          </h2>
          <p className="text-slate-400 text-sm mt-1">Seleccioná al ganador e ingresá la secuencia de números.</p>
        </div>
        <div className="flex w-full md:w-auto bg-surface-card border border-surface-border p-1 rounded-lg">
          <button onClick={() => setTab('pendientes')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${tab === 'pendientes' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200'}`}>
            Pendientes
          </button>
          <button onClick={() => setTab('finalizados')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${tab === 'finalizados' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200'}`}>
            Historial / Editar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <select value={filterTorneo} onChange={e => setFilterTorneo(e.target.value)} className="select-field">
            <option value="all">Todos los Torneos</option>
            {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="select-field">
            <option value="all">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filterFase} onChange={e => setFilterFase(e.target.value)} className="select-field">
            <option value="all">Todas las Fases</option>
            <option value="grupos">Fase de Grupos</option>
            <option value="eliminatorias">Eliminatorias</option>
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre de pareja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {loading && matches.length === 0 ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-500" /></div>
      ) : filteredMatches.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          {torneosIds.length === 0 ? 'No tenés torneos registrados.' : 'No hay partidos en esta vista o que coincidan con la búsqueda.'}
        </p>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4">
          {filteredMatches.map((match) => {
            const isP1Winner = selectedWinners[match.id] === match.p1?.id
            const isP2Winner = selectedWinners[match.id] === match.p2?.id
            return (
              <motion.div
                key={match.id}
                variants={itemVariants}
                className={`bg-surface-card border rounded-xl overflow-hidden shadow-lg transition-colors ${selectedWinners[match.id] ? 'border-brand-500/40' : 'border-surface-border'}`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 px-4 py-2.5 border-b border-surface-border/60 uppercase tracking-wider flex-wrap">
                  <Clock size={13} />
                  {match.fecha_hora ? new Date(match.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  <span className="text-slate-600">&bull;</span>
                  <MapPin size={11} />
                  <span className="truncate max-w-[120px]">{match.sedes?.nombre || 'Sin sede'}</span>
                  {match.fase_bracket && match.fase_bracket !== 'Fase de Grupos' && (
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                      {match.fase_bracket}
                    </span>
                  )}
                  <button
                    onClick={() => logisticaOpen === match.id ? setLogisticaOpen(null) : openLogistica(match)}
                    className="ml-auto p-1 rounded hover:bg-white/10 text-slate-500 hover:text-brand-400 transition-colors"
                    title="Editar sede, fecha y hora"
                  >
                    {logisticaOpen === match.id ? <X size={13} /> : <Pencil size={13} />}
                  </button>
                </div>

                {logisticaOpen === match.id && (
                  <div className="px-4 py-3 bg-surface/60 border-b border-surface-border/60 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Sede</label>
                      <select
                        className="select-field text-sm py-2"
                        value={logisticaForm[match.id]?.sedeId || ''}
                        onChange={e => setLogisticaForm(prev => ({ ...prev, [match.id]: { ...prev[match.id], sedeId: e.target.value } }))}
                      >
                        <option value="">Sin sede</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Fecha y hora</label>
                      <input
                        type="datetime-local"
                        className="input-field text-sm py-2"
                        value={logisticaForm[match.id]?.fechaHora || ''}
                        onChange={e => setLogisticaForm(prev => ({ ...prev, [match.id]: { ...prev[match.id], fechaHora: e.target.value } }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => handleSaveLogistica(match.id)}
                        disabled={savingLogistica === match.id}
                        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingLogistica === match.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Guardar
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-4 flex flex-col gap-4">
                  <div className="space-y-2">
                    {match.p1 ? (
                      <button onClick={() => handleWinnerSelect(match.id, match.p1.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${isP1Winner ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-bold shadow-inner shadow-brand-900/20' : 'bg-surface/50 border-transparent hover:border-slate-700 text-slate-200'}`}>
                        <span className="flex items-center justify-between">
                          <span>{match.p1.nombre_mostrado}</span>
                          {isP1Winner && <span className="text-base">🏆</span>}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full px-4 py-3 rounded-xl border border-dashed border-surface-border text-slate-500 italic text-sm bg-surface/30">Esperando ganador...</div>
                    )}

                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 h-px bg-surface-border/50" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">VS</span>
                      <div className="flex-1 h-px bg-surface-border/50" />
                    </div>

                    {match.p2 ? (
                      <button onClick={() => handleWinnerSelect(match.id, match.p2.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${isP2Winner ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-bold shadow-inner shadow-brand-900/20' : 'bg-surface/50 border-transparent hover:border-slate-700 text-slate-200'}`}>
                        <span className="flex items-center justify-between">
                          <span>{match.p2.nombre_mostrado}</span>
                          {isP2Winner && <span className="text-base">🏆</span>}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full px-4 py-3 rounded-xl border border-dashed border-surface-border text-slate-500 italic text-sm bg-surface/30">Esperando ganador...</div>
                    )}
                  </div>

                  <div className={`flex flex-col gap-3 pt-3 border-t border-surface-border/50 transition-opacity duration-300 ${selectedWinners[match.id] ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <p className="text-xs text-brand-400 font-semibold uppercase tracking-widest">Resultado</p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider pl-1">Sets (ej: 6475)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="6475"
                          disabled={savingMatchId !== null || loading}
                          value={inputs[match.id] || ''}
                          onChange={e => setInputs(prev => ({ ...prev, [match.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(match.id)}
                          className={`w-full border border-surface-border rounded-xl outline-none px-4 py-3 text-base text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-center tracking-widest font-mono ${tab === 'finalizados' ? 'bg-brand-900/10' : 'bg-surface'}`}
                        />
                      </div>

                      <div className="flex flex-col gap-1 sm:w-28">
                        <label className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider pl-1">Super TB (ej: 10-8)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="10-8"
                          disabled={savingMatchId !== null || loading}
                          value={stInputs[match.id] || ''}
                          onChange={e => setStInputs(prev => ({ ...prev, [match.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(match.id)}
                          className={`w-full rounded-xl outline-none px-3 py-3 text-sm text-amber-300 focus:ring-1 transition-all text-center tracking-wider font-mono ${stInputs[match.id] ? 'border border-amber-500/30 bg-amber-950/20 placeholder-amber-700' : 'border border-dashed border-slate-600 bg-transparent placeholder-slate-700'}`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleScoreSubmit(match.id)}
                      disabled={savingMatchId !== null || loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {savingMatchId === match.id
                        ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                        : <><CheckCircle2 size={18} /> Confirmar Resultado</>
                      }
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
