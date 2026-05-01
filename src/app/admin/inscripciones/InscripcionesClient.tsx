'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, UserPlus, Search, Loader2, AlertCircle, Users, UserPlus2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  userId: string
}

export default function InscripcionesClient({ userId }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [torneos, setTorneos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [torneoActivoId, setTorneoActivoId] = useState<string>('')

  const [inscriptos, setInscriptos] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const [categoriaId, setCategoriaId] = useState<string>('')

  const [searchQuery, setSearchQuery] = useState('')
  const [participantesDb, setParticipantesDb] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  const [selectedParticipante, setSelectedParticipante] = useState<any>(null)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoApellido2, setNuevoApellido2] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Tab state for mobile responsiveness
  const [mobileTab, setMobileTab] = useState<'lista' | 'nuevo'>('nuevo')
  
  const [filterInscriptos, setFilterInscriptos] = useState('')

  useEffect(() => {
    if (!userId) return
    async function initData() {
      // Solo torneos de este admin
      const { data: resT, error: errT } = await supabase
        .from('torneos')
        .select('*')
        .eq('admin_id', userId)
        .neq('estado', 'Finalizado')

      const { data: resC } = await supabase.from('categorias').select('*')

      if (errT) console.error('Error fetching torneos:', errT)

      if (resT && resT.length > 0) {
        resT.sort((a, b) => {
          if (!a.fecha_inicio) return -1
          if (!b.fecha_inicio) return 1
          return new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
        })
        setTorneos(resT)
        if (resT.length > 0) setTorneoActivoId(resT[0].id)
      }
      if (resC) {
        setCategorias(resC)
        if (resC.length > 0) setCategoriaId(resC[0].id)
      }
    }
    initData()
  }, [userId])

  useEffect(() => {
    if (torneoActivoId) fetchInscriptos(torneoActivoId)
  }, [torneoActivoId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchInscriptos = async (tid: string, showLoader = true) => {
    if (showLoader) setLoadingList(true)
    const { data } = await supabase
      .from('inscripciones')
      .select(`
        id, created_at,
        participantes!inner(id, nombre, apellido, nombre_mostrado),
        categorias!inner(id, nombre)
      `)
      .eq('torneo_id', tid)
      .order('created_at', { ascending: false })
    if (data) setInscriptos(data)
    if (showLoader) setLoadingList(false)
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const torneoActivo = torneos.find(t => t.id === torneoActivoId)
        const isDoble = torneoActivo?.modalidad === 'doble'

        let query = supabase
          .from('participantes')
          .select('*')
          .ilike('nombre_mostrado', `%${searchQuery}%`)

        if (isDoble) {
          query = query.ilike('nombre_mostrado', '% - %')
        } else {
          query = query.not('nombre_mostrado', 'ilike', '% - %')
        }

        const { data } = await query.limit(5)
        setParticipantesDb(data || [])
        setShowDropdown(true)
      } else {
        setParticipantesDb([])
        setShowDropdown(false)
      }
    }, 400)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, torneoActivoId, torneos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!torneoActivoId || !categoriaId) return
    setIsSubmitting(true)
    setFormMsg(null)

    const torneoActivo = torneos.find(t => t.id === torneoActivoId)
    const cap = (s: string) => s ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase() : ''
    const isDoble = torneoActivo?.modalidad === 'doble'

    let finalParticipanteId = selectedParticipante?.id

    if (!finalParticipanteId) {
      let insertData = {}

      if (isDoble) {
        if (!nuevoApellido || !nuevoApellido2) {
          setFormMsg({ type: 'error', text: 'Completá el apellido de ambos jugadores.' })
          setIsSubmitting(false)
          return
        }
        const a1 = cap(nuevoApellido)
        const a2 = cap(nuevoApellido2)
        const concatenatedName = `${a1} - ${a2}`
        insertData = { nombre: '', apellido: concatenatedName, nombre_mostrado: concatenatedName }
      } else {
        if (!nuevoApellido) {
          setFormMsg({ type: 'error', text: 'Completá al menos el apellido.' })
          setIsSubmitting(false)
          return
        }
        const a1 = cap(nuevoApellido)
        const n1 = nuevoNombre.trim() ? cap(nuevoNombre) : ''
        const nombreMostradoGenerado = n1
          ? `${n1.charAt(0).toUpperCase()}. ${a1}`
          : a1
        insertData = { nombre: n1, apellido: a1, nombre_mostrado: nombreMostradoGenerado }
      }

      const { data: newP, error: pError } = await supabase
        .from('participantes')
        .insert(insertData)
        .select('id').single()

      if (pError) {
        setFormMsg({ type: 'error', text: 'Error creando participante: ' + pError.message })
        setIsSubmitting(false)
        return
      }
      finalParticipanteId = newP.id
    }

    const catActual = categorias.find(c => c.id === categoriaId)

    const { data: insData, error: insError } = await supabase
      .from('inscripciones')
      .insert({ torneo_id: torneoActivoId, participante_id: finalParticipanteId, categoria_id: categoriaId })
      .select('id, created_at')
      .single()

    if (insError) {
      if (insError.code === '23505') {
        setFormMsg({ type: 'error', text: 'Este jugador ya está inscripto en el torneo.' })
      } else {
        setFormMsg({ type: 'error', text: 'Error en inscripción: ' + insError.message })
      }
    } else {
      // Optimistic update: add immediately to list without flicker
      const a1 = cap(nuevoApellido)
      const a2 = cap(nuevoApellido2)
      const n1 = nuevoNombre.trim() ? cap(nuevoNombre) : ''

      const nombreMostrado = selectedParticipante?.nombre_mostrado || (
        isDoble
          ? `${a1} - ${a2}`
          : n1
            ? `${n1.charAt(0).toUpperCase()}. ${a1}`
            : a1
      )
      const optimisticEntry = {
        id: insData.id,
        created_at: insData.created_at,
        participantes: {
          id: finalParticipanteId,
          nombre: selectedParticipante?.nombre || nuevoNombre || '',
          apellido: selectedParticipante?.apellido || nuevoApellido || '',
          nombre_mostrado: nombreMostrado,
        },
        categorias: { id: categoriaId, nombre: catActual?.nombre || '' },
      }
      setInscriptos(prev => [optimisticEntry, ...prev])

      setFormMsg({ type: 'success', text: '¡Jugador inscripto con éxito!' })
      setSelectedParticipante(null)
      setSearchQuery('')
      setNuevoNombre('')
      setNuevoApellido('')
      setNuevoApellido2('')
      setTimeout(() => setFormMsg(null), 3500)
      // Silent background sync to get server-assigned data
      fetchInscriptos(torneoActivoId, false)
    }
    setIsSubmitting(false)
  }

  const handleRemoveInscripcion = async (id: string, participanteId: string, nombre: string) => {
    if (!confirm(`¿Seguro querés dar de baja a ${nombre} de este torneo?`)) return
    // Optimistic remove
    setInscriptos(prev => prev.filter(i => i.id !== id))
    await supabase.from('partidos').delete()
      .or(`participante_1_id.eq.${participanteId},participante_2_id.eq.${participanteId}`)
      .eq('torneo_id', torneoActivoId)
    const { error } = await supabase.from('inscripciones').delete().eq('id', id)
    if (error) {
      alert('Error al dar de baja: ' + error.message)
      // Revert on error
      fetchInscriptos(torneoActivoId, false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserPlus className="text-brand-500" />
            Inscripciones
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Buscá jugadores del club o dálos de alta para competir en el torneo actual.
          </p>
        </div>
        
        {/* MOBILE TABS */}
        <div className="lg:hidden flex bg-surface border border-surface-border p-1 rounded-lg w-full md:w-auto mt-4">
          <button
            onClick={() => setMobileTab('lista')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold rounded-md transition-all ${
              mobileTab === 'lista' 
                ? 'bg-surface-card text-brand-400 shadow-sm border border-surface-border' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            Inscriptos ({inscriptos.length})
          </button>
          <button
            onClick={() => setMobileTab('nuevo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold rounded-md transition-all ${
              mobileTab === 'nuevo' 
                ? 'bg-surface-card text-brand-400 shadow-sm border border-surface-border' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus2 size={16} />
            Inscripción
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8 transform-gpu">

        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className={`${mobileTab === 'nuevo' ? 'block' : 'hidden'} lg:block bg-surface-card border border-surface-border rounded-xl p-5 shadow-lg h-fit sticky top-24`}>
          <h3 className="font-semibold text-brand-400 mb-5 pb-2 border-b border-surface-border/50">Inscripción</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Torneo Activo */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Torneo Activo</label>
              <select
                value={torneoActivoId}
                onChange={e => setTorneoActivoId(e.target.value)}
                className="select-field"
                disabled={torneos.length === 0}
              >
                {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                {torneos.length === 0 && <option value="">No hay torneos creados</option>}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Categoría a jugar</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="select-field"
                disabled={categorias.length === 0}
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Ficha Jugador */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Jugador</label>

              {(() => {
                const isDoble = torneos.find(t => t.id === torneoActivoId)?.modalidad === 'doble'

                if (selectedParticipante) {
                  return (
                    <div className="flex items-center justify-between bg-brand-600/10 border border-brand-500/30 rounded-lg p-3">
                      <div>
                        <p className="text-sm text-brand-300 font-bold">{selectedParticipante.nombre_mostrado}</p>
                        <p className="text-xs text-brand-500/70">Historial</p>
                      </div>
                      <button type="button" onClick={() => setSelectedParticipante(null)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-400/10 rounded">Desvincular</button>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {!isDoble && (
                      <>
                        <div className="relative" ref={dropdownRef}>
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Buscar por nombre o apellido..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => { if (participantesDb.length > 0) setShowDropdown(true) }}
                            className="input-field pl-10"
                          />
                          <AnimatePresence>
                            {showDropdown && participantesDb.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="absolute z-10 w-full mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl overflow-hidden"
                              >
                                {participantesDb.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { setSelectedParticipante(p); setShowDropdown(false); setSearchQuery('') }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-surface-hover text-sm border-b border-surface-border/50 last:border-0"
                                  >
                                    <span className="font-semibold text-slate-200">{p.nombre_mostrado}</span>
                                    {(p.nombre || p.apellido) && <span className="text-slate-500 text-xs ml-2">({p.nombre} {p.apellido})</span>}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="h-px bg-surface-border flex-1"></div>
                          <span className="text-xs text-slate-500 font-semibold uppercase">O Crear Nuevo</span>
                          <div className="h-px bg-surface-border flex-1"></div>
                        </div>
                      </>
                    )}

                    {isDoble ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="Apellido Jugador 1" value={nuevoApellido} onChange={e => setNuevoApellido(e.target.value)} className="input-field" />
                          <input type="text" placeholder="Apellido Jugador 2" value={nuevoApellido2} onChange={e => setNuevoApellido2(e.target.value)} className="input-field" />
                        </div>
                        <p className="text-[11px] text-slate-500">Ejemplo: Perez - Gomez</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="Inicial (Ej: J)" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="input-field" />
                          <input type="text" placeholder="Apellido" value={nuevoApellido} onChange={e => setNuevoApellido(e.target.value)} className="input-field" />
                        </div>
                        <p className="text-[11px] text-slate-500">Formato generado: J. Apellido</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {formMsg && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={`p-3 rounded-lg text-sm flex gap-2 items-center ${formMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'}`}>
                {formMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{formMsg.text}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || torneos.length === 0}
              className="btn-primary w-full py-3 text-base shadow-lg shadow-brand-900/20 mt-6"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Inscribir a Torneo'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: GRILLA DE INSCRIPTOS */}
        <div className={`${mobileTab === 'lista' ? 'block' : 'hidden'} lg:block`}>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-start justify-between px-1 gap-4 flex-wrap">
              <h3 className="font-semibold text-slate-200">Jugadores Registrados</h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {(() => {
                  const catCounts: Record<string, { nombre: string; count: number }> = {}
                  inscriptos.forEach(ins => {
                    const catId = ins.categorias?.id
                    const catNombre = ins.categorias?.nombre
                    if (!catId) return
                    if (!catCounts[catId]) catCounts[catId] = { nombre: catNombre, count: 0 }
                    catCounts[catId].count++
                  })
                  return Object.values(catCounts)
                    .filter(c => c.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map(c => (
                      <span key={c.nombre} className="text-xs font-semibold text-slate-400 bg-surface-card border border-surface-border px-2.5 py-1 rounded-full">
                        {c.nombre}: <span className="text-slate-200">{c.count}</span>
                      </span>
                    ))
                })()}
                <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full">Total: {inscriptos.length}</span>
              </div>
            </div>

            {inscriptos.length > 0 && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar en inscriptos..."
                  value={filterInscriptos}
                  onChange={e => setFilterInscriptos(e.target.value)}
                  className="input-field pl-10 bg-surface border-surface-border"
                />
              </div>
            )}
          </div>

          {(() => {
            const listFiltered = filterInscriptos.trim() 
              ? inscriptos.filter(ins => ins.participantes.nombre_mostrado.toLowerCase().includes(filterInscriptos.toLowerCase()))
              : inscriptos;

            if (loadingList) {
              return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-500" /></div>
            }

            if (listFiltered.length === 0) {
              return (
                <div className="bg-surface-card border border-surface-border border-dashed rounded-xl p-12 text-center text-slate-500">
                  {filterInscriptos.trim() 
                    ? <p>No se encontraron jugadores que coincidan con la búsqueda.</p>
                    : <>
                        <p>Todavía no hay jugadores en este torneo.</p>
                        <p className="text-xs mt-1">Utilizá el formulario para dar la primera alta.</p>
                      </>
                  }
                </div>
              )
            }

            return (
              <motion.div
                initial="hidden" animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                className="grid sm:grid-cols-2 gap-3"
              >
                {listFiltered.map(ins => (
                  <motion.div
                    key={ins.id}
                    variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                    className="bg-surface-card border border-surface-border hover:border-surface-border/80 rounded-lg p-3.5 flex items-center gap-4 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface border border-surface-border flex items-center justify-center text-brand-400 font-bold uppercase shrink-0">
                      {ins.participantes.nombre?.charAt(0) || ins.participantes.nombre_mostrado.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate">{ins.participantes.nombre_mostrado}</p>
                      <p className="text-xs text-slate-500 truncate">{ins.categorias.nombre}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveInscripcion(ins.id, ins.participante_id || ins.participantes.id, ins.participantes.nombre_mostrado)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2 shrink-0"
                      title="Dar de baja del torneo"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
