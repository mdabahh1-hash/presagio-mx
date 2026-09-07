/**
 * Adaptadores del CycleMarket del backend (precios string 0–1, campos
 * planos) a las formas que consumen los componentes de UI.
 */
import type { Category, Market } from '../../types'
import type { CycleMarket } from '../../lib/leaguesApi'
import { cleanLabel } from '../../lib/mapMarket'
import type { PreviewMarket } from './CyclePreview'

function categoryOf(m: CycleMarket): Category {
  return (m.category ?? 'Deportes') as Category
}

/** Etiqueta de una salida sin el emoji inicial de los seeds ("🏠 Udinese"). */
export function outcomeLabel(o: CycleMarket['outcomes'][number]): string {
  return o.label ? cleanLabel(o.label) : '—'
}

/** Lo mínimo que necesitan CyclePreview y MarketThumb. */
export function cycleMarketToPreview(m: CycleMarket): PreviewMarket {
  return {
    id: m.market_id,
    question: cleanLabel(m.question),
    endsAt: m.closes_at,
    category: categoryOf(m),
    subcategory: m.subcategory ?? null,
    imageUrl: m.image_url ?? null,
    outcomes:
      m.market_type === 'multi'
        ? m.outcomes.map(o => ({
            outcome_key: o.outcome_key ?? String(o.id),
            label: outcomeLabel(o),
            price: Number(o.price) * 100,
          }))
        : undefined,
  }
}

/** Market completo del UI (0–100) para MarketRow y afines. */
export function toUiMarket(m: CycleMarket): Market {
  const yes = m.outcomes.find(o => o.side === 'yes')
  const preview = cycleMarketToPreview(m)
  return {
    ...preview,
    description: '',
    yesPrice: Math.round(Number(yes?.price ?? 0.5) * 100),
    volume: 0,
    liquidity: 0,
    resolutionCriteria: '',
    trending: false,
    status: m.is_open ? 'open' : 'closed',
    marketType: m.market_type,
    outcomes: preview.outcomes ?? [],
    history: [],
    comments: [],
  }
}
