import type { ApiMarket } from './api'
import type { Category, Market, MarketStatus } from '../types'

// Algunos seeds ponen un emoji al inicio de los labels ("🏠 Real Madrid",
// "🤝 Empate", "🇲🇽 Sergio Pérez"). La UI nueva no usa emoji como icono, así
// que se limpian los pictogramas iniciales (solo los iniciales: un emoji a
// mitad de texto es contenido y se respeta).
const LEADING_PICTO = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}️‍\s]+/u
export function cleanLabel(s: string): string {
  const out = s.replace(LEADING_PICTO, '').trim()
  return out || s
}

// Single mapping from the API market shape to the UI Market. Keep it here —
// the old per-page copies drifted (both dropped `status`, which left the
// pending-resolution UI in MarketCard dead).
export function apiToMarket(m: ApiMarket): Market {
  return {
    id: m.id,
    question: cleanLabel(m.question),
    description: m.description,
    category: m.category as Category,
    subcategory: m.subcategory ?? null,
    imageUrl: m.image_url ?? null,
    yesPrice: Math.round(m.yes_price),
    volume: m.volume,
    liquidity: m.volume * 0.1,
    endsAt: m.ends_at,
    resolutionCriteria: '',
    trending: m.trending,
    status: m.status as MarketStatus,
    marketType: m.market_type ?? 'binary',
    outcomes: (m.outcomes ?? []).map(o => ({ ...o, label: cleanLabel(o.label) })),
    resolvedOutcomeKey: m.resolved_outcome_key,
    history: [],
    comments: [],
  }
}
