import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Categorías' }

export default function CategoriasPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-slate-100">Categorías</h2>
      <p className="text-slate-500 text-sm">Gestión de categorías y llaves — Fase 2.</p>
    </div>
  )
}
