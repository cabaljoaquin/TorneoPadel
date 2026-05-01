'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ConfiguracionPage() {
  const supabase = createClient()
  
  // States para Sede
  const [sedeName, setSedeName] = useState('')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [sedeStatus, setSedeStatus] = useState<{type: 'idle' | 'loading' | 'success' | 'error', msg?: string}>({ type: 'idle' })

  // States para Categoria
  const [catName, setCatName] = useState('')
  const [catGender, setCatGender] = useState('Mixto')
  const [catStatus, setCatStatus] = useState<{type: 'idle' | 'loading' | 'success' | 'error', msg?: string}>({ type: 'idle' })

  const handleSedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSedeStatus({ type: 'loading' })
    const { error } = await supabase.from('sedes').insert({ nombre: sedeName, es_principal: esPrincipal })
    
    if (error) setSedeStatus({ type: 'error', msg: error.message })
    else {
      setSedeStatus({ type: 'success', msg: 'Sede guardada' })
      setSedeName('')
      setEsPrincipal(false)
      setTimeout(() => setSedeStatus({ type: 'idle' }), 3000)
    }
  }

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCatStatus({ type: 'loading' })
    const { error } = await supabase.from('categorias').insert({ nombre: catName, genero: catGender })
    
    if (error) setCatStatus({ type: 'error', msg: error.message })
    else {
      setCatStatus({ type: 'success', msg: 'Categoría guardada' })
      setCatName('')
      setTimeout(() => setCatStatus({ type: 'idle' }), 3000)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Configuración</h2>
        <p className="text-slate-500 text-sm mt-1">Alta de parámetros base del sistema.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Sede */}
        <div className="card p-5">
          <h3 className="font-semibold text-brand-400 mb-4">Nueva Sede</h3>
          <form onSubmit={handleSedeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
              <input 
                type="text" 
                required 
                value={sedeName}
                onChange={e => setSedeName(e.target.value)}
                className="input-field" 
                placeholder="Ej: Club de Tenis Las Lomas" 
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={esPrincipal}
                onChange={e => setEsPrincipal(e.target.checked)}
                className="rounded border-surface-border text-brand-600 focus:ring-brand-500 bg-surface" 
              />
              <span className="text-sm text-slate-300">Es sede principal</span>
            </label>
            <button disabled={sedeStatus.type === 'loading'} type="submit" className="btn-primary w-full mt-2">
              {sedeStatus.type === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Sede'}
            </button>
            {sedeStatus.msg && (
              <p className={`text-xs mt-2 flex items-center gap-1 ${sedeStatus.type === 'error' ? 'text-red-400' : 'text-brand-400'}`}>
                {sedeStatus.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {sedeStatus.msg}
              </p>
            )}
          </form>
        </div>

        {/* Form Categoria */}
        <div className="card p-5">
          <h3 className="font-semibold text-brand-400 mb-4">Nueva Categoría</h3>
          <form onSubmit={handleCatSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
              <input 
                type="text" 
                required 
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="input-field" 
                placeholder="Ej: 3ra, 4ta, Damas A" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Género</label>
              <select 
                value={catGender}
                onChange={e => setCatGender(e.target.value)}
                className="input-field appearance-none"
              >
                <option>Masculino</option>
                <option>Femenino</option>
                <option>Mixto</option>
              </select>
            </div>
            <button disabled={catStatus.type === 'loading'} type="submit" className="btn-primary w-full mt-2">
              {catStatus.type === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Categoría'}
            </button>
            {catStatus.msg && (
              <p className={`text-xs mt-2 flex items-center gap-1 ${catStatus.type === 'error' ? 'text-red-400' : 'text-brand-400'}`}>
                {catStatus.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />} {catStatus.msg}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
