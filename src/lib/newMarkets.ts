import type { Market } from '../types'

// "Nuevo" = sembrado hace ≤3 días (decisión de Mark, 15-sep-2026). Misma regla
// para el sello dorado de la tarjeta y para la pestaña Nuevo (Home y /mercados).
export const NEW_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000
// Si no hay nada en ventana, la pestaña muestra los N más recientes con aviso
export const NEW_FALLBACK_COUNT = 12

export function isNewMarket(m: Market, now = Date.now()): boolean {
  if (m.status === 'pending_resolution' || !m.createdAt) return false
  return now - Date.parse(m.createdAt) < NEW_MAX_AGE_MS
}

// Lo último sembrado primero; los vencidos (por resolverse) al final
export function byNewest(a: Market, b: Market): number {
  const pa = a.status === 'pending_resolution' ? 1 : 0
  const pb = b.status === 'pending_resolution' ? 1 : 0
  if (pa !== pb) return pa - pb
  return (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0)
}

export function selectNewMarkets(markets: Market[]): { items: Market[]; fallback: boolean } {
  const sorted = [...markets].sort(byNewest)
  const fresh = sorted.filter(m => isNewMarket(m))
  if (fresh.length > 0) return { items: fresh, fallback: false }
  return { items: sorted.slice(0, NEW_FALLBACK_COUNT), fallback: true }
}
