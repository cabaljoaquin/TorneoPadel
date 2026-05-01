export interface StandingRow {
  id: string
  nombre: string
  pj: number
  pg: number
  pp: number
  sf: number
  sc: number
  ds: number
  puntos: number
}

export function calculateStandings(
  participantesZonas: { participantes: { id: string; nombre_mostrado: string } | null }[],
  partidos: any[]
): StandingRow[] {
  const stats: Record<string, StandingRow> = {}

  participantesZonas.forEach((pz) => {
    const p = pz.participantes
    if (!p?.id) return
    stats[p.id] = { id: p.id, nombre: p.nombre_mostrado, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0, ds: 0, puntos: 0 }
  })

  partidos.forEach((match) => {
    if (match.estado !== 'finalizado' || !match.ganador_id) return

    const p1id = match.p1?.id
    const p2id = match.p2?.id

    if (stats[p1id]) stats[p1id].pj++
    if (stats[p2id]) stats[p2id].pj++

    const winnerId = match.ganador_id
    const loserId = winnerId === p1id ? p2id : p1id

    if (stats[winnerId]) { stats[winnerId].pg++; stats[winnerId].puntos++ }
    if (stats[loserId]) stats[loserId].pp++

    if (match.resultado && Array.isArray(match.resultado)) {
      let s1 = 0, s2 = 0
      match.resultado.forEach((set: any) => {
        if (set.isSuper) return
        if (set.p1 > set.p2) s1++
        else if (set.p2 > set.p1) s2++
      })

      if ((winnerId === p2id && s1 > s2) || (winnerId === p1id && s2 > s1)) {
        const t = s1; s1 = s2; s2 = t
      }

      if (stats[p1id]) { stats[p1id].sf += s1; stats[p1id].sc += s2 }
      if (stats[p2id]) { stats[p2id].sf += s2; stats[p2id].sc += s1 }
    }
  })

  Object.values(stats).forEach((s) => { s.ds = s.sf - s.sc })

  return Object.values(stats).sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos
    if (b.ds !== a.ds) return b.ds - a.ds
    return b.pj - a.pj
  })
}

const POS_LABELS = ['1ro', '2do', '3ro', '4to', '5to', '6to']

export function parseOrigen(
  origen: string,
  zonas: { id: string; nombre: string }[],
  standingsMap: Map<string, StandingRow[]>
): string | null {
  for (let i = 0; i < POS_LABELS.length; i++) {
    const prefix = POS_LABELS[i] + ' '
    if (origen.startsWith(prefix)) {
      const zonaName = origen.slice(prefix.length)
      const zona = zonas.find((z) => z.nombre === zonaName)
      if (!zona) return null
      const standings = standingsMap.get(zona.id)
      if (!standings || standings.length <= i) return null
      return standings[i].id
    }
  }
  return null
}
