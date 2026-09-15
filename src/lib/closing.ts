import type { Market } from '../types'

// Rangos de cierre compartidos por el rail de categorías (CategoryBrowse) y el
// filtro "Cierre" de la pestaña Nuevo (NewFeed).
export type BucketKey = 'all' | 'now' | 'today' | 'week' | 'month' | 'later' | 'pending'

export const BUCKET_KEYS: BucketKey[] = ['all', 'now', 'today', 'week', 'month', 'later', 'pending']

// Bucket a market by hours-until-close (future-proof: minute/hour markets land
// in "now"). Expired-but-unresolved markets get their own terminal bucket so
// they don't inflate "Cierran ya" (their ends_at is already in the past).
export function bucketOf(m: Market): Exclude<BucketKey, 'all'> {
  if (m.status === 'pending_resolution') return 'pending'
  const h = (new Date(m.endsAt).getTime() - Date.now()) / 3_600_000
  if (h <= 1) return 'now'
  if (h <= 24) return 'today'
  if (h <= 24 * 7) return 'week'
  if (h <= 24 * 30) return 'month'
  return 'later'
}

// Cierre más próximo primero, pendientes al final.
export function byClosing(a: Market, b: Market): number {
  const pa = a.status === 'pending_resolution' ? 1 : 0
  const pb = b.status === 'pending_resolution' ? 1 : 0
  if (pa !== pb) return pa - pb
  return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
}
