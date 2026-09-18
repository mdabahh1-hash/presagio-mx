import type { Market } from '../types'

// Mercado mínimo para tests; cada test pisa lo que necesita.
export function makeMarket(over: Partial<Market> = {}): Market {
  return {
    id: 'm1', question: '¿Pregunta de prueba?', description: '', category: 'Economía',
    subcategory: null, yesPrice: 43, volume: 1000, liquidity: 0,
    endsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    resolutionCriteria: '', trending: false, status: 'open', marketType: 'binary',
    history: [], comments: [],
    ...over,
  }
}

export const MULTI_OUTCOMES = [
  { outcome_key: 'recorte', label: 'Recorte de 25 pb', price: 62 },
  { outcome_key: 'sin_cambio', label: 'Sin cambio', price: 29 },
  { outcome_key: 'alza', label: 'Alza', price: 6 },
  { outcome_key: 'recorte_50', label: 'Recorte de 50 pb', price: 3 },
]
