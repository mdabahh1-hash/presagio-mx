import type { PricePoint } from '../types'

export const DAY_MS = 86_400_000

/** Cambio en puntos porcentuales: último precio menos el vigente hace `ms`
 *  (último punto anterior al corte; si no hay, el primero, como movers.py). */
export function deltaSince(points: PricePoint[], ms: number): number | null {
  if (points.length < 2) return null
  const cutoff = Date.now() - ms
  let base = points[0]
  for (const p of points) {
    if (Date.parse(p.date) <= cutoff) base = p
    else break
  }
  return Math.round(points[points.length - 1].price - base.price)
}
