'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Settings,
  LogOut,
  Network,
  Trophy,
  GitBranch,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'

const ALL_NAV_ITEMS = [
  { label: 'Resumen',        href: '/admin',                icon: LayoutDashboard, requiresTorneos: true  },
  { label: 'Mis Torneos',    href: '/admin/torneos',        icon: Trophy,          requiresTorneos: false },
  { label: 'Inscripciones',  href: '/admin/inscripciones',  icon: Users,           requiresTorneos: false },
  { label: 'Zonas/Grupos',   href: '/admin/cuadros',        icon: Network,         requiresTorneos: false },
  { label: 'Playoffs',       href: '/admin/playoffs',       icon: GitBranch,       requiresTorneos: false },
  { label: 'Partidos',       href: '/admin/partidos',       icon: ListChecks,      requiresTorneos: false },
  { label: 'Configuración',  href: '/admin/configuracion',  icon: Settings,        requiresTorneos: false },
]

interface AdminSidebarProps {
  isOpen: boolean
  isDesktopCollapsed?: boolean
  onClose: () => void
  torneoCount: number
}

export default function AdminSidebar({ isOpen, isDesktopCollapsed, onClose, torneoCount }: AdminSidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  const navItems = useMemo(
    () => ALL_NAV_ITEMS.filter(item => !item.requiresTorneos || torneoCount > 0),
    [torneoCount]
  )

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col w-72 shrink-0
          bg-surface-card border-surface-border
          transition-all duration-300 ease-in-out
          md:static md:h-full md:z-auto
          ${isOpen ? 'translate-x-0 border-r' : '-translate-x-full border-r md:translate-x-0'}
          ${isDesktopCollapsed ? 'md:w-0 md:border-r-0 md:opacity-0 md:overflow-hidden' : 'md:w-64 md:opacity-100 md:border-r'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-border">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Trophy size={16} className="text-white" />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-slate-100 truncate">Administración</p>
            <p className="text-xs text-slate-500">Gestión de torneos</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`nav-link group ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-brand-400 shrink-0" />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-surface-border">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {loggingOut ? <Loader2 size={17} className="shrink-0 animate-spin" /> : <LogOut size={17} className="shrink-0" />}
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
