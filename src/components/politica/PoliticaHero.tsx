import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { MultiLineChart, type MultiSeries } from '../SparkChart'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { getCategoryColor, getCategoryBg } from '../../lib/categoryColors'
import { displayPair, probColor, probText } from '../../lib/prices'
import { formatVolume, formatCountdown } from '../../lib/format'
import { useCountdown } from '../../lib/useCountdown'
import { useElementWidth } from '../../lib/useElementWidth'

interface PoliticaHeroProps {
  market: Market
  // 1 o 2 series ya coloreadas (destacado en --text-primary, secundario en --text-tertiary)
  series: MultiSeries[]
  historyLoading: boolean
  // Cambio del Sí en puntos porcentuales en 7 días; null sin historial suficiente
  delta7: number | null
  // Abre el flujo de operar en sitio (TradeSheet + BetBox), no navega
  onBuy: (side: 'YES' | 'NO') => void
}

const CHART_H = 150

// Mercado destacado de la landing de Política: badge + en vivo + countdown,
// pregunta, probabilidad grande, CTAs Sí/No y gráfica de 90 días con dos líneas.
export function PoliticaHero({ market, series, historyLoading, delta7, onBuy }: PoliticaHeroProps) {
  const { t } = useTranslation()
  const diff = useCountdown(market.endsAt)
  const { text: countdown, urgent } = formatCountdown(diff)
  const pair = displayPair(market.yesPrice)
  const [chartRef, chartW] = useElementWidth()
  const hasChart = series.some(s => s.data.length > 1)

  const deltaText = delta7 === null ? null
    : delta7 > 0 ? t('politica.delta7Up', { count: delta7 })
    : delta7 < 0 ? t('politica.delta7Down', { count: Math.abs(delta7) })
    : t('politica.delta7Flat')
  const deltaColor = delta7 === null || delta7 === 0 ? undefined : delta7 > 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      {/* Fila superior */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="category" color={getCategoryColor(market.category)} bg={getCategoryBg(market.category)}>
            {market.subcategory ?? market.category}
          </Badge>
          <span className="meta-label">{t('home.featuredMarket')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="live-dot" />
            <span className="meta-label">{t('common.live')}</span>
          </span>
        </div>
        <div className="meta-label num" style={{ display: 'flex', alignItems: 'center', gap: 6, color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>
          <Icon name="clock" size={13} />
          {countdown}
        </div>
      </div>

      {/* Pregunta + probabilidad */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600, lineHeight: 1.3, maxWidth: 520 }}>
              {market.question}
            </h2>
          </Link>
          <div className="meta-label num">
            {t('card.vol')} {formatVolume(market.volume)} PT · {t('politica.trades', { count: market.numTrades ?? 0 })}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="num" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: probColor(market.yesPrice) }}>
            {probText(pair.yes)}
          </div>
          {deltaText && (
            <div className="meta-label num" style={{ marginTop: 4, color: deltaColor }}>{deltaText}</div>
          )}
        </div>
      </div>

      {/* CTAs: abren el sheet de operar, no navegan */}
      <div className="pol-hero-cta">
        <button type="button" className="btn btn-yes" onClick={() => onBuy('YES')}>
          {t('politica.buyYes', { pct: probText(pair.yes) })}
        </button>
        <button type="button" className="btn btn-no" onClick={() => onBuy('NO')}>
          {t('politica.buyNo', { pct: probText(pair.no) })}
        </button>
      </div>

      {/* Gráfica de 90 días */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="meta-label">{t('politica.historyTitle')}</span>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {series.map(s => (
              <span key={s.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                <span style={{ width: 18, height: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{s.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div ref={chartRef} style={{ minWidth: 0 }}>
          {historyLoading ? (
            <div className="skeleton" style={{ height: CHART_H, background: 'var(--bg-surface)', border: 'none' }} />
          ) : hasChart ? (
            <MultiLineChart series={series} height={CHART_H} viewW={chartW || 700} interactive={false} showLegend={false} />
          ) : (
            <div className="meta-label" style={{ height: CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t('common.noHistory')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
