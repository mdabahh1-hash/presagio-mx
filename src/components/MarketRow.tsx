import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'
import { outcomeLogo } from '../lib/teamLogos'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { Badge } from './Badge'

interface MarketRowProps {
  market: Market
  animClass?: string
  // Variante compacta (checklist de ligas): solo pregunta + probabilidades,
  // sin Link, sin badges ni meta — el contenedor pone su propio contexto.
  compact?: boolean
  // La fila vive dentro de una sección titulada con su subcategoría: el badge
  // repetiría el encabezado.
  hideSubcategory?: boolean
}

// Fila estilo Polymarket: thumbnail + pregunta + meta a la izquierda,
// probabilidades a la derecha. Es una fila de lista (divisor), no una tarjeta.
// Toda la fila es un Link al mercado.
export function MarketRow({ market, animClass = '', compact = false, hideSubcategory = false }: MarketRowProps) {
  const { t } = useTranslation()
  const isMulti = market.marketType === 'multi'
  const isPending = market.status === 'pending_resolution'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)

  const sortedOutcomes = isMulti
    ? [...(market.outcomes ?? [])].sort((a, b) => b.price - a.price)
    : []
  const topOutcomes = sortedOutcomes.slice(0, 3)
  const restOutcomes = sortedOutcomes.length - topOutcomes.length
  // Si algún resultado tiene escudo, toda la fila usa el chip horizontal
  const hasMarks = isMulti && sortedOutcomes.some(o => outcomeLogo(o, market.subcategory, market.id))
  const chipCls = `row-outcome-btn${hasMarks ? ' row-outcome-btn--mark' : ''}`

  const outcomesBlock = (
    <div className="market-row-outcomes">
      {isMulti ? (
        <>
          {topOutcomes.map(o => (
            <div key={o.outcome_key} className={chipCls} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              {hasMarks && <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={18} />}
              <span className="row-outcome-label" title={o.label}>{o.label}</span>
              <span className="row-outcome-price">{Math.round(o.price)}%</span>
            </div>
          ))}
          {restOutcomes > 0 && (
            <div className="row-outcome-btn" style={{ minWidth: 0, background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>
              +{restOutcomes}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="row-outcome-btn price-yes">
            <span className="row-outcome-label">{t('common.yes')}</span>
            <span className="row-outcome-price">{market.yesPrice}%</span>
          </div>
          <div className="row-outcome-btn price-no">
            <span className="row-outcome-label">{t('common.no')}</span>
            <span className="row-outcome-price">{100 - market.yesPrice}%</span>
          </div>
        </>
      )}
    </div>
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <p className="market-row-title" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>
          {market.question}
        </p>
        {outcomesBlock}
      </div>
    )
  }

  const badgeLabel = hideSubcategory && market.subcategory ? null : (market.subcategory ?? market.category)

  return (
    <Link
      to={`/mercado/${market.id}`}
      className={`list-row is-link market-row ${animClass}`}
      style={{ padding: '12px 0', opacity: isPending ? 0.8 : 1 }}
    >
      <MarketThumb market={market} size={56} className="market-row-thumb" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {badgeLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge tone="category" color={getCategoryColor(market.category)} bg={getCategoryBg(market.category)}>{badgeLabel}</Badge>
          </div>
        )}
        <p className="market-row-title" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>
          {market.question}
        </p>
        <div className="meta-label num" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{t('card.vol')} {formatVolume(market.volume)} PT</span>
          <span aria-hidden>·</span>
          {isPending ? (
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{t('card.waitingResolution')}</span>
          ) : (
            <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
          )}
        </div>
      </div>

      {outcomesBlock}
    </Link>
  )
}
