'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { Menu } from 'lucide-react'

interface Props {
  children: React.ReactNode
  torneoCount: number
}

export default function AdminLayoutClient({ children, torneoCount }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  const toggleSidebar = () => {
    if (window.innerWidth >= 768) {
      setDesktopCollapsed(!desktopCollapsed)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        isDesktopCollapsed={desktopCollapsed}
        onClose={() => setSidebarOpen(false)}
        torneoCount={torneoCount}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto transition-all duration-300">
        {/* Header con burger funcional en web y mobile */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-surface-border bg-surface-card/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
              aria-label="Alternar menú"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-slate-200 leading-tight">Panel de Administración</h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden md:block">Sistema de gestión de torneos</p>
            </div>
          </div>
          {/* Decoración tenis — raqueta + pelota */}
          <div className="flex items-center gap-1.5 select-none" title="TorneoTenis">
            <span className="text-xl leading-none">🎾</span>
            <span className="text-xl leading-none">🏸</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
