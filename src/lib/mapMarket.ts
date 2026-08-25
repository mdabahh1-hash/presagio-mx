import type { ApiMarket } from './api'
import type { Category, Market, MarketStatus } from '../types'

// Single mapping from the API market shape to the UI Market. Keep it here —
// the old per-page copies drifted (both dropped `status`, which left the
// pending-resolution UI in MarketCard dead).
export function apiToMarket(m: ApiMarket): Market {
  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category as Category,
    subcategory: m.subcategory ?? null,
    yesPrice: Math.round(m.yes_price),
    volume: m.volume,
    liquidity: m.volume * 0.1,
    endsAt: m.ends_at,
    resolutionCriteria: '',
    trending: m.trending,
    status: m.status as MarketStatus,
    marketType: m.market_type ?? 'binary',
    outcomes: m.outcomes ?? [],
    resolvedOutcomeKey: m.resolved_outcome_key,
    history: [],
    comments: [],
  }
}
