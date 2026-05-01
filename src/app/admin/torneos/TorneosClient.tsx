'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Trophy, Plus, Calendar, MapPin, Loader2, CheckCircle2, Circle,
  Pencil, Eye, EyeOff, X, Save, CheckCheck
} from 'lucide-react'

interface Torneo {
  id: string
  nombre: string
  slug: string | null
  estado: string
  modalidad: string | null
  formato: 'grupos' | 'eliminatoria' | null
  visible: boolean
  created_at: string
  fecha_inicio: string | null
  sede_id: string | null
  admin_id: string
  sedes?: { nombre: string } | null
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function generateUniqueSlug(supabase: any, base: string, excludeId?: string): Promise<string> {
  const baseSlug = toSlug(base)
  let candidate = baseSlug
  let counter = 2
  while (true) {
    let query = supabase.from('torneos').select('id').eq('slug', candidate)
    if (excludeId) query = query.neq('id', excludeId)
    const { data } = await query.maybeSingle()
    if (!data) return candidate
    candidate = `${baseSlug}-${counter++}`
  }
}

interface Props {
  torneos: Torneo[]
  userId: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error'
interface Toast { id: number; msg: string; type: ToastType }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])
  return { toasts, push }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl animate-slide-in border ${t.type === 'success'
              ? 'bg-brand-600/90 border-brand-500/50 text-white'
              : 'bg-red-600/90 border-red-500/50 text-white'
            }`}
        >
          {t.type === 'success' ? <CheckCheck size={15} /> : <X size={15} />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TorneosClient({ torneos: initialTorneos, userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { toasts, push } = useToast()

  const [torneos, setTorneos] = useState<Torneo[]>(initialTorneos)

  // Sync when server re-renders
  useEffect(() => { setTorneos(initialTorneos) }, [initialTorneos])

  // ── Crear torneo ──
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sedes, setSedes] = useState<any[]>([])
  const [sedeId, setSedeId] = useState('')
  const [nombre, setNombre] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [modalidad, setModalidad] = useState('single')
  const [formato, setFormato] = useState<'grupos' | 'eliminatoria'>('grupos')
  const [creating, setCreating] = useState(false)
  const [loadingSedes, setLoadingSedes] = useState(false)

  const openCreateModal = async () => {
    setShowCreateModal(true)
    if (sedes.length === 0) {
      setLoadingSedes(true)
      const { data } = await supabase.from('sedes').select('id, nombre')
      if (data) { setSedes(data); if (data.length > 0) setSedeId(data[0].id) }
      setLoadingSedes(false)
    }
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !userId) return
    setCreating(true)
    const slug = await generateUniqueSlug(supabase, slugInput || nombre)
    const { error } = await supabase.from('torneos').insert({
      nombre, slug, sede_id: sedeId || null, estado: 'En curso',
      admin_id: userId, modalidad, formato, visible: true,
    })
    if (!error) {
      setNombre(''); setSlugInput(''); setSlugManual(false); setShowCreateModal(false)
      push('Torneo creado con éxito')
      router.refresh()
    } else {
      push('Error al crear el torneo', 'error')
    }
    setCreating(false)
  }

  // ── Editar torneo ──
  const [editTorneo, setEditTorneo] = useState<Torneo | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editModalidad, setEditModalidad] = useState('single')
  const [editFormato, setEditFormato] = useState<'grupos' | 'eliminatoria'>('grupos')
  const [editSedeId, setEditSedeId] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [saving, setSaving] = useState(false)

  const openEdit = async (t: Torneo) => {
    setEditTorneo(t)
    setEditNombre(t.nombre)
    setEditSlug(t.slug ?? toSlug(t.nombre))
    setEditModalidad(t.modalidad ?? 'single')
    setEditFormato(t.formato ?? 'grupos')
    setEditSedeId(t.sede_id ?? '')
    setEditFecha(t.fecha_inicio ?? '')
    if (sedes.length === 0) {
      const { data } = await supabase.from('sedes').select('id, nombre')
      if (data) setSedes(data)
    }
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTorneo || !editNombre.trim()) return
    setSaving(true)
    const slugBase = editSlug.trim() || editNombre
    const slug = await generateUniqueSlug(supabase, slugBase, editTorneo.id)
    const { error } = await supabase.from('torneos').update({
      nombre: editNombre,
      slug,
      modalidad: editModalidad,
      formato: editFormato,
      sede_id: editSedeId || null,
      fecha_inicio: editFecha || null,
    }).eq('id', editTorneo.id)

    if (!error) {
      setTorneos(prev => prev.map(t =>
        t.id === editTorneo.id
          ? { ...t, nombre: editNombre, slug, modalidad: editModalidad, formato: editFormato, sede_id: editSedeId || null, fecha_inicio: editFecha || null }
          : t
      ))
      push('Cambios guardados')
      setEditTorneo(null)
      router.refresh()
    } else {
      push('Error al guardar', 'error')
    }
    setSaving(false)
  }

  // ── Toggle estado (En curso / Finalizado) ──
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const toggleEstado = async (id: string, currentEstado: string) => {
    setTogglingId(id)
    const nuevoEstado = currentEstado === 'En curso' ? 'Finalizado' : 'En curso'
    const { error } = await supabase.from('torneos').update({ estado: nuevoEstado }).eq('id', id)
    if (!error) {
      setTorneos(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t))
    }
    setTogglingId(null)
    router.refresh()
  }

  // ── Toggle visibilidad ──
  const [togglingVisId, setTogglingVisId] = useState<string | null>(null)
  const toggleVisible = async (id: string, currentVisible: boolean) => {
    setTogglingVisId(id)
    const nuevoVisible = !currentVisible
    const { error } = await supabase.from('torneos').update({ visible: nuevoVisible }).eq('id', id)
    if (!error) {
      setTorneos(prev => prev.map(t => t.id === id ? { ...t, visible: nuevoVisible } : t))
      push(nuevoVisible ? 'Torneo publicado' : 'Torneo ocultado del público')
    } else {
      push('Error al cambiar visibilidad', 'error')
    }
    setTogglingVisId(null)
  }

  return (
    <>
      <ToastContainer toasts={toasts} />

      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 italic tracking-tight">Mis Torneos</h2>
            <p className="text-sm text-slate-500 mt-1">Historial y gestión de todas tus competiciones.</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={18} />
            <span>Nuevo Torneo</span>
          </button>
        </div>

        {/* Lista */}
        <div className="grid gap-4">
          {torneos.map((t) => (
            <div
              key={t.id}
              className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden group hover:border-brand-500/30 transition-all shadow-sm"
            >
              {/* Info row */}
              <div className="flex items-center gap-4 p-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.estado === 'En curso' ? 'bg-brand-500/10 text-brand-400' : 'bg-slate-800 text-slate-600'}`}>
                  <Trophy size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-100 text-base leading-tight truncate">{t.nombre}</h3>
                    {!t.visible && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-400 border border-slate-600/40 shrink-0">
                        Oculto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {t.sedes?.nombre || 'Sin sede'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {t.fecha_inicio
                        ? new Date(t.fecha_inicio.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR')
                        : 'Sin fecha'}
                    </span>
                    <span className="capitalize opacity-70">{t.modalidad ?? 'single'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${t.formato === 'eliminatoria'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      }`}>
                      {t.formato === 'eliminatoria' ? '⚡ Eliminación Directa' : '🏆 Fase de Grupos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones — barra completa en mobile, inline en desktop */}
              <div className="flex border-t border-surface-border/60 divide-x divide-surface-border/60 sm:border-none sm:divide-none sm:p-4 sm:pt-0 sm:gap-2 sm:justify-end">

                {/* Visibilidad */}
                <button
                  onClick={() => toggleVisible(t.id, t.visible)}
                  disabled={togglingVisId === t.id}
                  title={t.visible ? 'Ocultar del público' : 'Publicar'}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-3 sm:py-1.5 sm:px-3 sm:rounded-full text-xs font-semibold transition-all sm:border disabled:opacity-50 ${t.visible
                      ? 'text-sky-400 sm:bg-sky-500/10 sm:border-sky-500/20 sm:hover:bg-sky-500/20'
                      : 'text-slate-500 sm:bg-slate-800 sm:border-slate-700 sm:hover:text-slate-300'
                    }`}
                >
                  {togglingVisId === t.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : t.visible ? <Eye size={14} /> : <EyeOff size={14} />
                  }
                  <span>{t.visible ? 'Público' : 'Oculto'}</span>
                </button>

                {/* Estado */}
                <button
                  onClick={() => toggleEstado(t.id, t.estado)}
                  disabled={togglingId === t.id}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-3 sm:py-1.5 sm:px-3 sm:rounded-full text-xs font-semibold uppercase tracking-wider transition-all sm:border disabled:opacity-50 ${t.estado === 'En curso'
                      ? 'text-brand-400 sm:bg-brand-500/10 sm:border-brand-500/20 sm:hover:bg-brand-500/20'
                      : 'text-slate-500 sm:bg-slate-800 sm:border-slate-700 sm:hover:text-slate-300'
                    }`}
                >
                  {togglingId === t.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : t.estado === 'En curso' ? <CheckCircle2 size={14} /> : <Circle size={14} />
                  }
                  <span>{t.estado === 'En curso' ? 'Activo' : 'Inactivo'}</span>
                </button>

                {/* Editar */}
                <button
                  onClick={() => openEdit(t)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-3 sm:py-2 sm:px-3 sm:rounded-lg text-xs font-semibold text-slate-400 hover:text-brand-400 sm:hover:bg-brand-500/10 sm:border sm:border-transparent sm:hover:border-brand-500/20 transition-all"
                  title="Editar torneo"
                >
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}

          {torneos.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-surface-border rounded-3xl">
              <Trophy size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400">No tenés torneos registrados todavía.</p>
              <button onClick={openCreateModal} className="text-brand-400 font-semibold mt-2 hover:underline">
                Crear el primero ahora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal CREAR ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-surface border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100 mb-5">Iniciar Nuevo Torneo</h3>
            <form onSubmit={handleCrear} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nombre del Evento</label>
                <input type="text" autoFocus placeholder="Ej: Copa de Verano 2025"
                  className="input-field" value={nombre}
                  onChange={e => { setNombre(e.target.value); if (!slugManual) setSlugInput(toSlug(e.target.value)) }} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">URL del Torneo</label>
                <div className="flex items-center gap-0 rounded-xl border border-surface-border bg-surface overflow-hidden focus-within:border-brand-500 transition-colors">
                  <span className="px-3 py-2.5 text-xs text-slate-500 bg-surface-card border-r border-surface-border shrink-0">/torneo/</span>
                  <input type="text" placeholder="copa-de-verano-2025"
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-200 outline-none"
                    value={slugInput}
                    onChange={e => { setSlugManual(true); setSlugInput(toSlug(e.target.value)) }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Se genera automáticamente. Podés editarlo.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Modalidad</label>
                <div className="flex gap-4 p-1">
                  {['single', 'doble'].map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="modalidad-crear" value={m}
                        checked={modalidad === m} onChange={e => setModalidad(e.target.value)}
                        className="w-4 h-4" />
                      <span className="text-sm font-semibold text-slate-300 capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Formato del Torneo</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'grupos', label: '🏆 Fase de Grupos', desc: 'Fase de zonas + Eliminatorias' },
                    { value: 'eliminatoria', label: '⚡ Eliminación Directa', desc: '' },
                  ] as const).map(opt => (
                    <label key={opt.value} className={`flex flex-col gap-0.5 p-3 rounded-xl border cursor-pointer transition-all ${formato === opt.value
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-surface-border bg-surface hover:border-slate-600 text-slate-400'
                      }`}>
                      <input type="radio" name="formato-crear" value={opt.value}
                        checked={formato === opt.value} onChange={e => setFormato(e.target.value as 'grupos' | 'eliminatoria')}
                        className="sr-only" />
                      <span className="font-bold text-sm">{opt.label}</span>
                      <span className="text-[11px] opacity-70">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              {loadingSedes ? (
                <div className="flex justify-center py-2"><Loader2 className="animate-spin text-brand-500" size={18} /></div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Sede Principal</label>
                  <select className="input-field appearance-none bg-surface" value={sedeId} onChange={e => setSedeId(e.target.value)}>
                    <option value="">Seleccionar sede...</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-slate-400 hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !nombre.trim()} className="flex-1 btn-primary">
                  {creating ? <Loader2 className="animate-spin" size={18} /> : 'Crear Torneo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal EDITAR ─────────────────────────────────────────────────── */}
      {editTorneo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditTorneo(null)} />
          <div className="relative bg-surface border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-100">Editar Torneo</h3>
              <button onClick={() => setEditTorneo(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nombre del Evento</label>
                <input type="text" autoFocus className="input-field"
                  value={editNombre} onChange={e => setEditNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">URL del Torneo (Slug)</label>
                <div className="flex items-center gap-0 rounded-xl border border-surface-border bg-surface overflow-hidden focus-within:border-brand-500 transition-colors">
                  <span className="px-3 py-2.5 text-xs text-slate-500 bg-surface-card border-r border-surface-border shrink-0">/torneo/</span>
                  <input type="text"
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-200 outline-none"
                    value={editSlug}
                    onChange={e => setEditSlug(toSlug(e.target.value))} />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Cambiar el slug puede romper links externos existentes.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Modalidad</label>
                <div className="flex gap-4 p-1">
                  {['single', 'doble'].map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="modalidad-editar" value={m}
                        checked={editModalidad === m} onChange={e => setEditModalidad(e.target.value)}
                        className="w-4 h-4" />
                      <span className="text-sm font-semibold text-slate-300 capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Formato del Torneo</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'grupos', label: '🏆 Fase de Grupos', desc: 'Round Robin + Eliminatorias' },
                    { value: 'eliminatoria', label: '⚡ Eliminación Directa', desc: 'Knockout puro' },
                  ] as const).map(opt => (
                    <label key={opt.value} className={`flex flex-col gap-0.5 p-3 rounded-xl border cursor-pointer transition-all ${editFormato === opt.value
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-surface-border bg-surface hover:border-slate-600 text-slate-400'
                      }`}>
                      <input type="radio" name="formato-editar" value={opt.value}
                        checked={editFormato === opt.value} onChange={e => setEditFormato(e.target.value as 'grupos' | 'eliminatoria')}
                        className="sr-only" />
                      <span className="font-bold text-sm">{opt.label}</span>
                      <span className="text-[11px] opacity-70">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Fecha de Inicio</label>
                <input type="date" className="input-field"
                  value={editFecha ? editFecha.slice(0, 10) : ''}
                  onChange={e => setEditFecha(e.target.value)} />
              </div>
              {sedes.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Sede Principal</label>
                  <select className="input-field appearance-none bg-surface" value={editSedeId} onChange={e => setEditSedeId(e.target.value)}>
                    <option value="">Sin sede</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditTorneo(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border text-slate-400 hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !editNombre.trim()} className="flex-1 btn-primary">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={15} /> Guardar Cambios</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
