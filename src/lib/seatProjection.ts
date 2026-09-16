import type { Market, Outcome } from '../types'
import type { ApiProyeccion } from './api'

// Proyección de escaños calculada en vivo: cada partido tiene un mercado multi
// cuyas opciones son rangos de escaños; el contenido curado declara cuántos
// escaños "vale" cada rango (punto medio) y aquí se hace la esperanza
// Σ precio × escaños con los precios que trae el listado. Nada se inventa: si
// falta el mercado o las opciones no coinciden con el mapa, la fila queda en null.

export interface SeatRow {
  partido: string
  mercadoId: string
  // Escaños esperados (redondeados); null = sin datos para este partido
  seats: number | null
  // Opción con mayor precio (el rango más probable), para mostrar el porqué
  top: Outcome | null
}

export interface SeatProjectionResult {
  rows: SeatRow[]
  total: number
  // Suma de esperados de las filas con datos
  sum: number
  // Escaños sin asignar a ningún partido de la barra (nunca negativo)
  rest: number
  // Denominador de la barra: si las esperanzas rebasan el total, la barra se comprime
  scale: number
}

export function topOutcome(m: Market): Outcome | null {
  const outs = m.outcomes ?? []
  if (outs.length === 0) return null
  return outs.reduce((best, o) => (o.price > best.price ? o : best), outs[0])
}

export function expectedSeats(m: Market | undefined, map: Record<string, number> | undefined): number | null {
  if (!m || !map || m.marketType !== 'multi') return null
  const outs = m.outcomes ?? []
  const keys = Object.keys(map)
  if (outs.length < 2 || outs.length !== keys.length) return null
  if (!outs.every(o => o.outcome_key in map)) return null
  const total = outs.reduce((s, o) => s + (o.price / 100) * map[o.outcome_key], 0)
  return Math.round(total)
}

export function projectSeats(proyeccion: ApiProyeccion, markets: Market[]): SeatProjectionResult {
  const byId = new Map(markets.map(m => [m.id, m]))
  const rows: SeatRow[] = proyeccion.bloques.map(b => {
    const m = byId.get(b.mercado_id)
    const seats = expectedSeats(m, b.escanos_por_opcion)
    return { partido: b.partido, mercadoId: b.mercado_id, seats, top: seats !== null && m ? topOutcome(m) : null }
  })
  const sum = rows.reduce((s, r) => s + (r.seats ?? 0), 0)
  const total = proyeccion.total
  return { rows, total, sum, rest: Math.max(0, total - sum), scale: Math.max(sum, total) }
}
