import type { PricePoint } from '../types'
import type { ApiPricePoint } from './api'

// Rangos de la gráfica de precio (detalle de mercado y hero de la landing de Deportes).
export type ChartRange = '1h' | '6h' | '1d' | '1w' | '1m' | 'all'
export const CHART_RANGES: ChartRange[] = ['1h', '6h', '1d', '1w', '1m', 'all']
export const RANGE_LABELS: Record<ChartRange, string> = { '1h': '1H', '6h': '6H', '1d': '1D', '1w': '1S', '1m': '1M', all: '' }
export const RANGE_MS: Record<ChartRange, number> = {
  '1h': 3_600_000, '6h': 6 * 3_600_000, '1d': 86_400_000, '1w': 7 * 86_400_000, '1m': 30 * 86_400_000, all: Infinity,
}

/** Recorta la serie al rango; antepone el último punto previo al corte
 *  (carry-forward) para que la línea no arranque "en el aire". */
export function filterRange(data: PricePoint[], range: ChartRange): PricePoint[] {
  if (range === 'all' || data.length === 0) return data
  const now = Date.now()
  const cutoff = now - RANGE_MS[range]
  const last = data[data.length - 1]
  const firstIdx = data.findIndex(p => Date.parse(p.date) >= cutoff)
  const out = firstIdx === -1 ? [] : data.slice(firstIdx)
  const prev = firstIdx === -1 ? last : firstIdx > 0 ? data[firstIdx - 1] : null
  if (prev) out.unshift({ date: new Date(cutoff).toISOString(), price: prev.price })
  // El precio vigente se extiende hasta ahora para que la gráfica cubra todo el rango.
  out.push({ date: new Date(now).toISOString(), price: last.price })
  return out
}

/** Historial del API → serie binaria (filas sin outcome_key) y series por opción
 *  (multi: una fila por opción y operación). La fila placeholder del seed de un
 *  multi (yes_price 0, sin outcome_key) se ignora, como en movers.py. */
export function splitHistory(hist: ApiPricePoint[]): { binary: PricePoint[]; byOutcome: Record<string, PricePoint[]> } {
  const binary: PricePoint[] = []
  const byOutcome: Record<string, PricePoint[]> = {}
  for (const p of hist) {
    const point = { date: p.recorded_at, price: p.yes_price }
    if (!p.outcome_key) {
      if (p.yes_price > 0) binary.push(point)
      continue
    }
    ;(byOutcome[p.outcome_key] ??= []).push(point)
  }
  return { binary, byOutcome }
}
