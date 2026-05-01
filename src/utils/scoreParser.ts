export function parseTennisScore(input: string): any[] {
  const str = input.replace(/\D/g, '')
  if (str.length === 0) return []

  const sets: any[] = []
  let i = 0

  while (i < str.length) {
    if (i + 1 >= str.length) break

    const p1 = parseInt(str[i], 10)
    const p2 = parseInt(str[i + 1], 10)
    const remaining = str.slice(i)

    const lastSet = sets[sets.length - 1]
    const wasTiebreak =
      lastSet &&
      ((lastSet.p1 === 7 && lastSet.p2 === 6) || (lastSet.p1 === 6 && lastSet.p2 === 7)) &&
      lastSet.tb1 === undefined

    if (wasTiebreak) {
      let tbHandled = false

      // Prioridad 1: tiebreak extendido de 4 dígitos (ej: 1210 → 12-10, 1012 → 10-12)
      if (!tbHandled && remaining.length >= 4) {
        const a = parseInt(remaining.substring(0, 2))
        const b = parseInt(remaining.substring(2, 4))
        if ((a >= 10 || b >= 10) && Math.abs(a - b) === 2) {
          lastSet.tb1 = a; lastSet.tb2 = b; i += 4; tbHandled = true
        }
      }

      // Prioridad 2: tiebreak extendido de 3 dígitos, primer valor 2 dígitos (ej: 108 → 10-8)
      if (!tbHandled && remaining.length >= 3) {
        const a = parseInt(remaining.substring(0, 2))
        const b = parseInt(remaining.substring(2, 3))
        if (a >= 10 && Math.abs(a - b) === 2) {
          lastSet.tb1 = a; lastSet.tb2 = b; i += 3; tbHandled = true
        }
      }

      // Prioridad 3: tiebreak extendido de 3 dígitos, segundo valor 2 dígitos (ej: 810 → 8-10)
      if (!tbHandled && remaining.length >= 3) {
        const a = parseInt(remaining.substring(0, 1))
        const b = parseInt(remaining.substring(1, 3))
        if (b >= 10 && Math.abs(b - a) === 2) {
          lastSet.tb1 = a; lastSet.tb2 = b; i += 3; tbHandled = true
        }
      }

      // Prioridad 4: tiebreak estándar de 7 puntos (ej: 75 → 7-5, 86 → 8-6)
      if (!tbHandled) {
        const isTb =
          (p1 === 7 && p2 <= 5) ||
          (p2 === 7 && p1 <= 5) ||
          (p1 >= 6 && p2 >= 6 && Math.abs(p1 - p2) === 2)
        if (isTb) {
          lastSet.tb1 = p1; lastSet.tb2 = p2; i += 2; tbHandled = true
        }
      }

      if (tbHandled) continue
    }

    sets.push({ p1, p2 })
    i += 2
  }

  return sets
}
