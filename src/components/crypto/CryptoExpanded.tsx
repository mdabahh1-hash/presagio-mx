import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Market, PricePoint } from '../../types'
import type { ApiPricePoint } from '../../lib/api'
import { Icon } from '../Icon'
import { FullChart } from '../SparkChart'
import { BetBox } from '../BetBox'
import type { TradeIntent } from '../../lib/tradeIntent'
import { useElementWidth } from '../../lib/useElementWidth'
import { splitHistory } from '../../lib/chartRange'
import { deltaSince, DAY_MS } from '../../lib/priceDelta'
import { topOutcome } from '../../lib/seatProjection'

const CHART_H = 272

export type Side = 'YES' | 'NO'

// Bloque bajo la fila expandida: gráfica de 90 días + criterios a la izquierda y
// BetBox a la derecha (cotización, saldo, errores y envío son los de BetBox).
export function CryptoExpanded({ market, history, side, amount, outcomeKey, onOutcome, onClose, onRequireAuth, onTraded }: {
  market: Market
  history: ApiPricePoint[] | undefined
  side: Side
  amount: number
  outcomeKey: string | null
  onOutcome: (key: string) => void
  onClose: () => void
  onRequireAuth: (intent: TradeIntent) => void
  onTraded: (newYesPrice: number) => void
}) {
  const { t } = useTranslation()
  const [chartRef, chartW] = useElementWidth()
  const isMulti = market.marketType === 'multi'
  const lider = isMulti ? topOutcome(market) : null

  // Serie del Sí (binario) o de la opción líder (multi); sin historial suficiente, noHistory
  let data: PricePoint[] = []
  if (history) {
    const { binary, byOutcome } = splitHistory(history)
    data = isMulti ? (lider ? byOutcome[lider.outcome_key] ?? [] : []) : binary
  }
  const serieLabel = isMulti ? lider?.label ?? '' : t('common.yes')
  const delta = deltaSince(data, 7 * DAY_MS)

  return (
    <div className="crypto-expanded" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 308px', gap: 14, alignItems: 'start', padding: '0 0 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="card" style={{ padding: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <h3 className="section-title" style={{ fontSize: 15 }}>{t('politica.historyTitle')}</h3>
          {delta !== null && (
            <span className="meta-label num" style={{ color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : undefined }}>
              {delta > 0 ? t('crypto.delta7Up', { label: serieLabel, count: delta })
                : delta < 0 ? t('crypto.delta7Down', { label: serieLabel, count: Math.abs(delta) })
                : t('crypto.delta7Flat', { label: serieLabel })}
            </span>
          )}
        </div>
        <div ref={chartRef} style={{ minWidth: 0 }}>
          {history === undefined ? (
            <div className="skeleton" style={{ height: CHART_H }} />
          ) : data.length > 1 ? (
            <FullChart data={data} height={CHART_H} viewW={chartW || 700} label={serieLabel} />
          ) : (
            <div style={{ height: CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              {t('common.noHistory')}
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 12, paddingTop: 12 }}>
          <div className="meta-label" style={{ marginBottom: 6 }}>{t('crypto.criteria')}</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{market.resolutionCriteria}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, position: 'relative', minWidth: 0 }}>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28 }}>
          <Icon name="x" size={14} />
        </button>
        <BetBox
          key={`${market.id}-${side}`}
          marketId={market.id}
          yesPrice={market.yesPrice}
          marketType={isMulti ? 'multi' : 'binary'}
          outcomes={market.outcomes ?? []}
          selectedOutcomeKey={outcomeKey}
          onOutcomeSelect={onOutcome}
          subcategory={market.subcategory}
          initialSide={side}
          initialAmount={amount}
          compact
          onRequireAuth={onRequireAuth}
          onTraded={onTraded}
        />
      </div>
    </div>
  )
}
