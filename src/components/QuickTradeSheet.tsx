import { useCallback, useState } from 'react'
import type { Market } from '../types'
import { BetBox } from './BetBox'
import { TradeSheet } from './TradeSheet'
import { AuthModal } from './AuthModal'
import { buildTradeRoute, type TradeIntent } from '../lib/tradeIntent'

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

// Compra rápida sin navegar: hoja inferior con el BetBox. Sin sesión, el acceso va
// DENTRO de la misma hoja: el fondo y el panel no se desmontan, solo cambia el
// contenido, y el BetBox sigue montado (oculto) para que opción, lado y monto
// sigan ahí al volver. Google/GitHub salen de la página: su `next` es la ruta del
// detalle con lo elegido. La comparten MarketGrid, Deportes, Política y Crypto (móvil).
export function QuickTradeSheet({ market, side, onClose, onTraded, outcomeKey, onOutcomeChange, initialAmount, betKey }: QuickTradeSheetProps) {
  // Lo que el usuario había elegido al pedirle sesión; null = se ve la compra
  const [auth, setAuth] = useState<TradeIntent | null>(null)
  const [returned, setReturned] = useState(false)
  const close = useCallback(() => { setAuth(null); setReturned(false); onClose() }, [onClose])
  const backToTrade = () => { setAuth(null); setReturned(true) }
  return (
    <TradeSheet open={!!market} onClose={close} contentKey={auth ? 'auth' : 'trade'}>
      {market && (
        <>
          <div hidden={!!auth} className={returned ? 'sheet-swap' : undefined}>
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
              onRequireAuth={setAuth}
              onTraded={onTraded}
            />
          </div>
          {auth && (
            <div className="sheet-swap">
              <AuthModal embedded initialMode="register" oauthNextRoute={buildTradeRoute(market.id, auth)} onClose={backToTrade} />
            </div>
          )}
        </>
      )}
    </TradeSheet>
  )
}
