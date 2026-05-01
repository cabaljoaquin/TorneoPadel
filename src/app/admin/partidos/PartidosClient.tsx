'use client'

import { motion, Variants } from 'framer-motion'
import { CheckCircle2, Clock, Trophy, Loader2, Search } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { parseTennisScore } from '@/utils/scoreParser'
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
    loadTorneos()
    loadCategories()
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
        id, fecha_hora, estado, participante_1_id, participante_2_id, ganador_id, resultado, fase_bracket,
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
    const parsedSets = parseTennisScore(scoreStr)
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
            placeholder="Buscar por nombre de jugador..."
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
                className={`bg-surface-card border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg transition-colors ${selectedWinners[match.id] ? 'border-brand-500/40' : 'border-surface-border'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                    <Clock size={13} />
                    {match.fecha_hora ? new Date(match.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    <span className="text-slate-600">•</span> {match.sedes?.nombre || 'Sede N/A'}
                    {match.fase_bracket && match.fase_bracket !== 'Fase de Grupos' && (
                      <span className="ml-auto bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-widest">
                        {match.fase_bracket}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {match.p1 ? (
                      <button onClick={() => handleWinnerSelect(match.id, match.p1.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${isP1Winner ? 'bg-brand-600/20 border-brand-500 text-brand-400 font-bold' : 'bg-surface/50 border-transparent hover:border-slate-700 text-slate-200'}`}>
                        {match.p1.nombre_mostrado} {isP1Winner && '🏆'}
                      </button>
                    ) : (
                      <div className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-surface-border text-slate-500 italic text-sm bg-surface/30">Esperando ganador...</div>
                    )}
                    
                    {match.p2 ? (
                      <button onClick={() => handleWinnerSelect(match.id, match.p2.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${isP2Winner ? 'bg-brand-600/20 border-brand-500 text-brand-400 font-bold' : 'bg-surface/50 border-transparent hover:border-slate-700 text-slate-200'}`}>
                        {match.p2.nombre_mostrado} {isP2Winner && '🏆'}
                      </button>
                    ) : (
                      <div className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-surface-border text-slate-500 italic text-sm bg-surface/30">Esperando ganador...</div>
                    )}
                  </div>
                </div>
                <div className={`flex flex-col gap-2 transition-opacity duration-300 ${selectedWinners[match.id] ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <label className="text-xs text-brand-400 font-medium text-center md:text-right">Resultado de los Sets</label>
                  <div className="flex items-center gap-2 self-center md:self-end">
                    <input
                      type="text"
                      placeholder="Ex: 6475"
                      disabled={savingMatchId !== null || loading}
                      value={inputs[match.id] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [match.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(match.id)}
                      className={`w-32 md:w-40 hover:bg-surface-hover/50 border border-surface-border rounded-lg outline-none px-2 md:px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-center tracking-widest font-mono ${tab === 'finalizados' ? 'bg-brand-900/10' : 'bg-surface'}`}
                    />
                    <div className="relative">
                      <input
                        type="text"
                          placeholder="Ej: 10-8"
                          disabled={savingMatchId !== null || loading}
                          value={stInputs[match.id] || ''}
                          onChange={e => setStInputs(prev => ({ ...prev, [match.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(match.id)}
                          className={`w-24 md:w-28 rounded-lg outline-none px-1 md:px-3 py-2.5 text-xs text-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all text-center tracking-wider font-mono ${stInputs[match.id] ? 'border border-amber-500/30 bg-amber-950/20 placeholder-amber-700' : 'border border-dashed border-slate-600 bg-transparent placeholder-slate-700'} ${tab === 'finalizados' && stInputs[match.id] ? 'bg-amber-900/10' : ''}`}
                      />
                      <span className="absolute -top-2 left-2 text-[9px] font-bold uppercase tracking-widest text-amber-500/70 bg-surface-card px-1">STB</span>
                    </div>
                    <button
                      onClick={() => handleScoreSubmit(match.id)}
                      disabled={savingMatchId !== null || loading}
                      className="p-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50 flex-shrink-0"
                      title="Guardar partido"
                    >
                      {savingMatchId === match.id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
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
