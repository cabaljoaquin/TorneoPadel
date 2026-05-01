'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, User, Trophy, ArrowRight, AlertCircle } from 'lucide-react'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AdminLoginPage() {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    // Anexar un dominio predeterminado para poder usar Supabase Auth 
    // sin que el usuario tenga que escribir un email real.
    const fakeEmail = `${username.trim().toLowerCase()}@torneo.com`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (authError) {
      setError(authError.message === 'Invalid login credentials' 
        ? 'Usuario o contraseña incorrectos' 
        : authError.message)
      setIsLoading(false)
    } else {
      window.location.href = '/admin/partidos'
    }
  }

  return (
    <div className="min-h-screen bg-surface bg-court-pattern flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-radial from-brand-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-900/50 mb-4">
            <Trophy size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">Acceso Admin</h1>
          <p className="text-sm text-slate-400 mt-1">Ingresá con tu usuario de administrador</p>
        </div>

        <div className="card p-6 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: admin"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-fade-in">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-primary w-full mt-1"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5">
            ¿Problemas para acceder?{' '}
            <a href="mailto:soporte@club.com" className="text-brand-500 hover:text-brand-400 transition-colors">
              Contactá al organizador
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          TorneoTenis © 2025 — Plataforma de torneos amateur
        </p>
      </div>
    </div>
  )
}
