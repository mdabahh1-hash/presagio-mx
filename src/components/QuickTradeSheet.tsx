import { useState } from 'react'
import type { Market } from '../types'
import { BetBox } from './BetBox'
import { TradeSheet } from './TradeSheet'
import { AuthModal } from './AuthModal'

interface QuickTradeSheetProps {
  // Mercado vivo que se opera; null = hoja cerrada
  market: Market | null
  side: 'YES' | 'NO'
  onClose: () => void
  // Tras operar, quien la monta parchea el precio (y recarga las opciones si es multi)
  onTraded: (newYesPrice: number) => void
  // Opción elegida controlada desde fuera (chips de la tarjeta, líder en Deportes,
  // fila de Crypto). Sin onOutcomeChange, el BetBox lleva su propia selección (Política).
  outcomeKey?: string | null
  onOutcomeChange?: (key: string) => void
  // Monto inicial (Crypto: la «compra rápida» guardada); sin él, el default del BetBox
  initialAmount?: number
  // Key del BetBox: cuándo se remonta (y pierde el monto) lo decide quien la monta
  betKey: string
}

// Compra rápida sin navegar: hoja inferior con el BetBox y, sin sesión, el acceso.
// La comparten MarketGrid, Deportes, Política y Crypto (móvil).
export function QuickTradeSheet({ market, side, onClose, onTraded, outcomeKey, onOutcomeChange, initialAmount, betKey }: QuickTradeSheetProps) {
  const [authOpen, setAuthOpen] = useState(false)
  return (
    <>
      <TradeSheet open={!!market} onClose={onClose}>
        {market && (
          <BetBox
            key={betKey}
            marketId={market.id}
            yesPrice={market.yesPrice}
            marketType={market.marketType === 'multi' ? 'multi' : 'binary'}
            outcomes={market.outcomes ?? []}
            {...(onOutcomeChange && { selectedOutcomeKey: outcomeKey ?? null, onOutcomeSelect: onOutcomeChange })}
            subcategory={market.subcategory}
            initialSide={side}
            initialAmount={initialAmount}
            compact
            onRequireAuth={() => { onClose(); setAuthOpen(true) }}
            onTraded={onTraded}
          />
        )}
      </TradeSheet>
      {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}
    </>
  )
}
