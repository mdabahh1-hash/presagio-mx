import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, PricePoint } from '../../types'
import type { ApiPricePoint } from '../../lib/api'
import { MarketThumb } from '../MarketThumb'
import { Icon } from '../Icon'
import { FullChart } from '../SparkChart'
import { BetBox } from '../BetBox'
import { displayPair, probText } from '../../lib/prices'
import { formatVolume, formatCountdown } from '../../lib/format'
import { useCountdown } from '../../lib/useCountdown'
import { useElementWidth } from '../../lib/useElementWidth'
import { splitHistory } from '../../lib/chartRange'
import { deltaSince, DAY_MS } from '../../lib/priceDelta'
import { topOutcome } from '../../lib/seatProjection'

const CHART_H = 272
const SOON_MS = 7 * DAY_MS

export type Side = 'YES' | 'NO'

// Fila de la lista de Crypto: el texto navega al detalle; los chips Sí/No no
// navegan, piden expandir la fila (en móvil la página abre el TradeSheet).
export function CryptoRow({ market, expanded, hideSub, source, onChip, onCollapse }: {
  market: Market
  expanded: boolean
  hideSub: boolean
  source: string | null
  onChip: (side: Side) => void
  onCollapse: () => void
}) {
  const { t } = useTranslation()
  const diff = useCountdown(market.endsAt)
  const { text: countdown } = formatCountdown(diff)
  const soon = diff > 0 && diff <= SOON_MS
  const pair = displayPair(market.yesPrice)
  const isMulti = market.marketType === 'multi'
  const lider = isMulti ? topOutcome(market) : null
  const rest = isMulti ? (market.outcomes?.length ?? 0) - 1 : 0
  const chip: React.CSSProperties = { minWidth: 146, height: 42, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div
      className="list-row is-link market-row"
      style={{ gridTemplateColumns: '44px minmax(0, 1fr) 308px', gap: 14, padding: '12px 0', background: expanded ? 'var(--bg-hover)' : undefined, borderBottom: expanded ? 'none' : undefined }}
    >
      <MarketThumb market={market} size={44} className="market-row-thumb" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <Link
          to={`/mercado/${market.id}`}
          className="crypto-row-title"
          style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {market.question}
        </Link>
        <div className="meta-label num" style={{ display: 'flex', gap: 6, alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {!hideSub && market.subcategory && <><span>{market.subcategory}</span><span aria-hidden>·</span></>}
          <span>{t('card.vol')} {formatVolume(market.volume)} PT</span>
          <span aria-hidden>·</span>
          <span style={{ color: soon ? 'var(--red)' : undefined }}>{countdown}</span>
          {source && market.resolutionSourceUrl && (
            <>
              <span aria-hidden>·</span>
              <a href={market.resolutionSourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'inherit', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Icon name="external" size={12} />{source}
              </a>
            </>
          )}
        </div>
      </div>

      {expanded ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCollapse} style={{ justifySelf: 'end' }} aria-expanded="true">
          {t('crypto.trading')}
          <Icon name="chevron-up" size={14} />
        </button>
      ) : (
        <div className="market-row-outcomes" style={{ justifyContent: 'flex-end' }}>
          {isMulti ? (
            lider && (
              <>
                <button type="button" className="row-outcome-btn" style={{ ...chip, background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} onClick={() => onChip('YES')}>
                  <span className="row-outcome-label" title={lider.label}>{lider.label}</span>
                  <span className="row-outcome-price">{probText(lider.price)}</span>
                </button>
                {rest > 0 && (
                  <button type="button" className="row-outcome-btn" style={{ ...chip, minWidth: 0, background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }} onClick={() => onChip('YES')}>
                    {t('card.more', { count: rest })}
                  </button>
                )}
              </>
            )
          ) : (
            <>
              <button type="button" className="row-outcome-btn price-yes" style={chip} onClick={() => onChip('YES')}>
                <span className="row-outcome-label">{t('common.yes')}</span>
                <span className="row-outcome-price">{probText(pair.yes)}</span>
              </button>
              <button type="button" className="row-outcome-btn price-no" style={chip} onClick={() => onChip('NO')}>
                <span className="row-outcome-label">{t('common.no')}</span>
                <span className="row-outcome-price">{probText(pair.no)}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

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
  onRequireAuth: () => void
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
