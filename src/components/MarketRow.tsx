import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../types'
import { getCategoryColor, getCategoryBg, getCategoryBorder } from '../lib/categoryColors'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'

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

const badgeBase: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.03em',
  textTransform: 'uppercase', padding: '3px 8px', borderRadius: 99,
}

// Fila ancha estilo Polymarket: info del mercado a la izquierda, "botones" de
// resultado a la derecha. Toda la fila es un Link al mercado (los botones son
// decorativos; quick-bet queda como mejora futura).
// Densidad: un solo badge (categoría/subcategoría) como máximo. MULTI ya se
// lee en los botones de resultado, TENDENCIA es ranking (no contenido) y
// "por resolverse" vive en la línea de meta + borde dorado.
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

  const outcomesBlock = (
    <div className="market-row-outcomes">
      {isMulti ? (
        <>
          {topOutcomes.map(o => (
            <div key={o.outcome_key} className="row-outcome-btn" style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            }}>
              <span className="row-outcome-label" style={{ color: 'var(--text-secondary)' }} title={o.label}>
                {o.label}
              </span>
              <span className="row-outcome-price" style={{ color: 'var(--gold)' }}>
                {Math.round(o.price)}%
              </span>
            </div>
          ))}
          {restOutcomes > 0 && (
            <div className="row-outcome-btn" style={{
              minWidth: 0, justifyContent: 'center',
              background: 'transparent', border: '1px dashed var(--border-subtle)',
              color: 'var(--text-tertiary)', fontSize: '0.72rem', fontWeight: 700,
            }}>
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
        <p className="font-display market-row-title" style={{
          margin: 0, fontSize: '0.95rem', fontWeight: 600,
          color: 'var(--text-primary)', lineHeight: 1.35, letterSpacing: '-0.01em',
        }}>
          {market.question}
        </p>
        {outcomesBlock}
      </div>
    )
  }

  const badgeLabel = hideSubcategory && market.subcategory ? null : (market.subcategory ?? market.category)

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card market-row"
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          ...(isPending ? { borderColor: 'var(--oro-glow)', opacity: 0.85 } : {}),
        }}
      >
        {/* Izquierda: badge + pregunta + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {badgeLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                ...badgeBase, fontSize: '0.62rem', padding: '3px 9px',
                color: getCategoryColor(market.category),
                background: getCategoryBg(market.category),
                border: `1px solid ${getCategoryBorder(market.category)}`,
              }}>
                {badgeLabel}
              </span>
            </div>
          )}

          <p className="font-display market-row-title" style={{
            margin: 0, fontSize: '1.02rem', fontWeight: 500,
            color: 'var(--text-primary)', lineHeight: 1.35, letterSpacing: '-0.01em',
          }}>
            {market.question}
          </p>

          <div className="meta-label" style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: '0.72rem' }}>
            <span>
              {t('card.vol')}{' '}
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                {formatVolume(market.volume)}
              </span>
            </span>
            {isPending ? (
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{t('card.waitingResolution')}</span>
            ) : (
              <span style={{
                color: urgent ? 'var(--red)' : 'var(--text-tertiary)',
                fontWeight: urgent ? 600 : 500,
              }}>
                {countdownText}
              </span>
            )}
          </div>
        </div>

        {/* Derecha: botones de resultado */}
        {outcomesBlock}
      </div>
    </Link>
  )
}
