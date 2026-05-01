'use client'

import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import { Users, User, CalendarDays, Trophy, ArrowRight } from 'lucide-react'

interface Torneo {
  id: string
  nombre: string
  slug: string | null
  estado: string
  modalidad: string | null
  created_at: string
  fecha_inicio: string | null
  sedes?: { nombre: string } | null
}

interface Props {
  torneos: Torneo[]
}

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Fecha a confirmar'
  return new Date(dateStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function TorneosGrid({ torneos }: Props) {
  if (torneos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-24 px-4"
      >
        <div className="w-20 h-20 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-6">
          <Trophy size={36} className="text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-300">Próximamente nuevos torneos</h3>
        <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
          Estamos organizando las próximas competencias. ¡Volvé pronto!
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {torneos.map((t) => (
        <motion.div
          key={t.id}
          variants={cardVariants}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="group relative bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col gap-5 overflow-hidden cursor-pointer hover:border-brand-500/40 transition-colors duration-300 shadow-lg shadow-black/20"
        >
          {/* Glow accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center shrink-0 group-hover:border-brand-500/40 transition-colors">
              <Trophy size={22} className="text-brand-400" />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              t.estado === 'En curso'
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
            }`}>
              {t.estado}
            </span>
          </div>

          {/* Body */}
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-slate-100 group-hover:text-brand-300 transition-colors leading-tight">
              {t.nombre}
            </h3>
            {t.sedes?.nombre && (
              <p className="text-xs text-slate-500 mt-1">{t.sedes.nombre}</p>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} />
              <span>{formatDate(t.fecha_inicio ?? t.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              {t.modalidad === 'doble' ? <Users size={13} /> : <User size={13} />}
              <span className="capitalize">{t.modalidad ?? 'Single'}</span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/torneo/${t.slug || t.id}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl transition-all duration-200 active:scale-95 group/btn"
          >
            Ver Cuadros / Resultados
            <ArrowRight size={15} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}

export function HeroText() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600/20 border border-brand-600/30 text-brand-400 text-xs font-bold uppercase tracking-widest"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
        Plataforma de Torneos
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.65, ease: 'easeOut' }}
        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight max-w-3xl"
      >
        Viví tus torneos{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">
          más de cerca
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="text-slate-300 text-lg sm:text-xl max-w-xl leading-relaxed"
      >
        Seguí llaves, resultados y posiciones en tiempo real. Todo lo que pasa en la cancha, acá.
      </motion.p>

      <motion.a
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        href="#torneos"
        className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-bold text-base rounded-2xl transition-all duration-200 active:scale-95 shadow-lg shadow-brand-900/40"
      >
        Ver torneos disponibles
        <ArrowRight size={18} />
      </motion.a>
    </motion.div>
  )
}
