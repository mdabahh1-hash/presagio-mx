// Intención de compra que viaja en la URL del detalle: /mercado/:id?side=NO&monto=250&outcome=key.
// La usan «Copiar jugada» y el regreso de OAuth (el `next` firmado lleva esta ruta).
// Todo lo que llega por URL se valida aquí antes de prellenar nada.
import { isSafeRoute } from './returnTo'

export interface TradeIntent {
  side: 'YES' | 'NO'
  amount?: number
  outcomeKey?: string
}

// Espejos de MIN_AMOUNT (BetBox) y del tope de 7 dígitos de su input
const MIN = 10
const MAX = 9_999_999
const OUTCOME_KEY = /^[A-Za-z0-9_-]{1,100}$/

/** Ruta del detalle con la intención, o undefined si no pasa `isSafeRoute` (p. ej. > 200 caracteres). */
export function buildTradeRoute(marketId: string, intent: TradeIntent): string | undefined {
  const q = new URLSearchParams({ side: intent.side })
  if (intent.amount && Number.isFinite(intent.amount)) q.set('monto', String(Math.round(intent.amount)))
  if (intent.outcomeKey) q.set('outcome', intent.outcomeKey)
  const route = `/mercado/${encodeURIComponent(marketId)}?${q}`
  return isSafeRoute(route) ? route : undefined
}

/**
 * Lee ?side ?monto ?outcome. Sin un `side` válido no hay intención (null). `monto` debe
 * ser un entero dentro de los límites del BetBox y `outcome` una key bien formada; lo que
 * no cumple se descarta. Que la opción exista en el mercado lo comprueba quien la usa.
 */
export function parseTradeIntent(params: URLSearchParams): TradeIntent | null {
  const side = params.get('side')
  if (side !== 'YES' && side !== 'NO') return null
  const intent: TradeIntent = { side }
  const monto = params.get('monto')
  if (monto && /^\d{1,7}$/.test(monto)) {
    const n = Number(monto)
    if (n >= MIN && n <= MAX) intent.amount = n
  }
  const outcome = params.get('outcome')
  if (outcome && OUTCOME_KEY.test(outcome)) intent.outcomeKey = outcome
  return intent
}
