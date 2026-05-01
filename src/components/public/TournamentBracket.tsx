'use client'

import { motion, Variants } from 'framer-motion'

interface Match {
  id: string
  p1: string
  p2: string
  scoreStr?: string
  scoreList?: {s1: number, s2: number, tb1?: number, tb2?: number}[]
  p1Wins?: boolean
  p2Wins?: boolean
  finished?: boolean
  isPlaceholder?: boolean
  isP1Waiting?: boolean
  isP2Waiting?: boolean
  isHidden?: boolean
  bracket_index?: number
}

interface Round {
  title: string
  matches: Match[]
}

export default function TournamentBracket({ rounds }: { rounds: Round[] }) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2 } }
  }

  const columnVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex overflow-x-auto py-8 px-4 gap-12 no-scrollbar"
    >
      {rounds.map((round, rIndex) => (
        <motion.div
          key={round.title}
          variants={columnVariants}
          className="flex flex-col gap-8 min-w-[220px]"
          style={{ justifyContent: 'space-around' }}
        >
          <h3 className="text-center text-sm font-semibold text-brand-400 mb-2 uppercase tracking-wider">
            {round.title}
          </h3>
          <div className="flex flex-col h-full gap-6" style={{ justifyContent: 'space-around' }}>
            {round.matches.map((match) => (
              <div
                key={match.id}
                className={match.isHidden ? "opacity-0 pointer-events-none h-[88px] w-full" : `relative rounded-lg overflow-hidden flex flex-col shadow-lg shadow-black/20 ${
                  match.isPlaceholder
                    ? 'bg-amber-500/5 border border-amber-500/30'
                    : 'bg-surface-card border border-surface-border'
                }`}
              >
                {match.isPlaceholder && !match.isHidden && (
                  <div className="absolute -left-[1px] -top-[1px] bg-slate-900 border border-slate-700/50 text-slate-500 text-[9px] font-bold px-1.5 rounded-br-lg z-10">
                    P{match.bracket_index !== undefined ? match.bracket_index + 1 : rIndex + 1}
                  </div>
                )}
                {/* Badge placeholder */}
                {match.isPlaceholder && (
                  <div className="px-3 pt-1.5 pb-0">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500/70">
                      Por confirmar
                    </span>
                  </div>
                )}

                {/* Jugador 1 */}
                <div
                  className={`px-3 py-2 flex justify-between items-center border-b transition-colors duration-500 ${
                    match.isPlaceholder
                      ? 'border-amber-500/20 text-amber-300/80'
                      : match.isP1Waiting
                      ? 'border-surface-border/50 text-slate-500 italic bg-slate-900/10'
                      : match.p1Wins
                      ? 'border-surface-border/50 text-brand-400 font-bold bg-brand-500/10'
                      : match.finished
                      ? 'border-surface-border/50 text-slate-500'
                      : 'border-surface-border/50 text-slate-300'
                  }`}
                >
                  <span className={`text-sm truncate pr-2 flex items-center gap-2 ${match.isPlaceholder ? 'italic' : ''}`}>
                    {match.p1}
                    {match.p1Wins && <span title="Ganador">🏆</span>}
                  </span>
                  <div className="flex gap-2.5 font-mono text-sm ml-4">
                    {match.scoreList?.map((set, i) => (
                      <div key={i} className="flex relative items-start w-3 justify-center">
                        <span>{set.s1}</span>
                        {set.tb1 !== undefined && (
                          <span className="absolute -right-2 -top-1 text-[8px] opacity-70">{set.tb1}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jugador 2 */}
                <div
                  className={`px-3 py-2 flex justify-between items-center transition-colors duration-500 ${
                    match.isPlaceholder
                      ? 'text-amber-300/80'
                      : match.isP2Waiting
                      ? 'text-slate-500 italic bg-slate-900/10'
                      : match.p2Wins
                      ? 'text-brand-400 font-bold bg-brand-500/10'
                      : match.finished
                      ? 'text-slate-500'
                      : 'text-slate-300'
                  }`}
                >
                  <span className={`text-sm truncate pr-2 flex items-center gap-2 ${match.isPlaceholder ? 'italic' : ''}`}>
                    {match.p2}
                    {match.p2Wins && <span title="Ganador">🏆</span>}
                  </span>
                  <div className="flex gap-2.5 font-mono text-sm ml-4">
                    {match.scoreList?.map((set, i) => (
                      <div key={i} className="flex relative items-start w-3 justify-center">
                        <span>{set.s2}</span>
                        {set.tb2 !== undefined && (
                          <span className="absolute -right-2 -top-1 text-[8px] opacity-70">{set.tb2}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conectores */}
                {!match.isHidden && rIndex < rounds.length - 1 && (
                  <div className="absolute top-1/2 -right-6 w-6 h-px bg-surface-border" />
                )}
                {!match.isHidden && rIndex > 0 && (
                  <div className="absolute top-1/2 -left-6 w-6 h-px bg-surface-border" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

