import type { Market } from '../../types'

// La API no expone auto_resolucion (el umbral con el que se resuelve), así que la
// escalera se reconoce por la redacción de siembra «cerrará <mes> en US$N [millones] o más».
// ponytail: el umbral sale de la pregunta; tests/test_escaleras_crypto.py (backend)
// garantiza que N == auto_resolucion.valor. Exponer el campo en la API si esto crece.
// Espejo exacto de LADDER_RE en ese test.
const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre'
const LADDER_RE = new RegExp(`cerrará (?:${MESES}) en (US\\$([\\d,]+(?:\\.\\d+)?)( millones)?) o más`)

export interface Peldano { market: Market; label: string; valor: number }
export interface Escalera { sub: string; endsAt: string; peldanos: Peldano[] }

const MIN_PELDANOS = 4

function peldano(m: Market): Peldano | null {
  const r = LADDER_RE.exec(m.question)
  if (!r) return null
  const n = Number(r[2].replace(/,/g, ''))
  return { market: m, label: r[1], valor: r[3] ? n * 1e6 : n }
}

// Binarios abiertos de la subcategoría con redacción de escalera y el mismo ends_at;
// el grupo de ≥4 que cierra antes. Sin grupo → null (el bloque no se monta).
export function escaleraDe(markets: Market[], sub: string): Escalera | null {
  const grupos = new Map<string, Peldano[]>()
  for (const m of markets) {
    if (m.subcategory !== sub || m.status !== 'open' || m.marketType === 'multi') continue
    const p = peldano(m)
    if (p) grupos.set(m.endsAt, [...(grupos.get(m.endsAt) ?? []), p])
  }
  const [endsAt, peldanos] = [...grupos.entries()]
    .filter(([, ps]) => ps.length >= MIN_PELDANOS)
    .sort(([a], [b]) => Date.parse(a) - Date.parse(b))[0] ?? []
  if (!endsAt || !peldanos) return null
  return { sub, endsAt, peldanos: peldanos.sort((a, b) => a.valor - b.valor) }
}

// Ventanas de cierre del filtro (?ventana=). Mes y año en hora de CDMX.
export const VENTANAS = ['mes', 'anio', 'multi', '7d'] as const
export type Ventana = typeof VENTANAS[number]
export const isVentana = (v: string | null | undefined): v is Ventana => VENTANAS.includes(v as Ventana)

const mesCdmx = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }).slice(0, 7)

export function enVentana(m: Market, v: Ventana, now = new Date()): boolean {
  if (v === 'multi') return m.marketType === 'multi'
  if (v === '7d') {
    const ms = Date.parse(m.endsAt) - now.getTime()
    return ms > 0 && ms <= 7 * 86_400_000
  }
  const mes = mesCdmx(m.endsAt)
  return v === 'mes' ? mes === mesCdmx(now) : mes === `${mesCdmx(now).slice(0, 4)}-12`
}
