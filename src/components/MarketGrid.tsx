import { useCallback, useState, type ReactNode } from 'react'
import type { Market } from '../types'
import { MarketCard } from './MarketCard'
import { QuickTradeSheet } from './QuickTradeSheet'

interface MarketGridProps {
  markets: Market[]
  // Tras operar, la página parchea el precio (y recarga las opciones si es multi)
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
  loading?: boolean
  skeletons?: number
  // Primera celda del grid (tarjeta panel de Deportes/Política/Crypto)
  lead?: ReactNode
}

// Grid de tarjetas del sitio (Tendencia, Nuevo, /mercados y landing de categoría):
// mismas columnas y gap en todas las vistas (.market-grid en index.css) y compra
// rápida Sí/No en un TradeSheet sin navegar.
export function MarketGrid({ markets, onTraded, loading = false, skeletons = 6, lead }: MarketGridProps) {
  const [trade, setTrade] = useState<{ marketId: string; side: 'YES' | 'NO'; outcomeKey?: string } | null>(null)
  const [tradeOutcome, setTradeOutcome] = useState<string | null>(null)
  const closeTrade = useCallback(() => setTrade(null), [])
  // El sheet lee el mercado vivo por id: tras operar refleja el precio nuevo
  const tradeMarket = trade ? markets.find(m => m.id === trade.marketId) ?? null : null

  if (loading) {
    return (
      <div className="market-grid">
        {[...Array(skeletons)].map((_, i) => <div key={i} className="skeleton market-card-skeleton" />)}
      </div>
    )
  }

  return (
    <>
      <div className="market-grid">
        {lead}
        {markets.map((m, i) => (
          <MarketCard
            key={m.id}
            market={m}
            animClass={i < 6 ? `anim-${i + 1}` : ''}
            onQuickTrade={(side, outcomeKey) => { setTradeOutcome(outcomeKey ?? null); setTrade({ marketId: m.id, side, outcomeKey }) }}
          />
        ))}
      </div>

      <QuickTradeSheet
        market={tradeMarket}
        side={trade?.side ?? 'YES'}
        betKey={`${trade?.marketId}-${trade?.side}-${trade?.outcomeKey ?? ''}`}
        outcomeKey={tradeOutcome}
        onOutcomeChange={setTradeOutcome}
        onClose={closeTrade}
        onTraded={p => tradeMarket && onTraded(tradeMarket.id, p, tradeMarket.marketType === 'multi')}
      />
    </>
  )
}
