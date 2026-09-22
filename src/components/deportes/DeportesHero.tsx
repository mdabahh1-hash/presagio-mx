import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { MultiLineChart, type MultiSeries } from '../SparkChart'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { Tabs } from '../Tabs'
import { TeamMark } from '../TeamMark'
import { MarketThumb } from '../MarketThumb'
import { probColor, probText } from '../../lib/prices'
import { formatVolume, formatCountdown } from '../../lib/format'
import { useCountdown } from '../../lib/useCountdown'
import { useElementWidth } from '../../lib/useElementWidth'
import { outcomeLogo } from '../../lib/teamLogos'
import { RANGE_LABELS, type ChartRange } from '../../lib/chartRange'

interface DeportesHeroProps {
  market: Market
  // 1 serie (binario) o hasta 3 (opciones líderes de un multi), ya recortadas al rango
  series: MultiSeries[]
  historyLoading: boolean
  // Cambio en 24 h del Sí (binario) o de la opción líder (multi); null sin historial
  delta: number | null
  range: ChartRange
  onRange: (r: ChartRange) => void
  // Abre TradeSheet + BetBox sin navegar; en multi, con la opción líder preseleccionada
  onTrade: () => void
}

const CHART_H = 160
const HERO_RANGES: ChartRange[] = ['6h', '1d', '1w', 'all']

// Mercado destacado de la landing de Deportes: badges, pregunta, probabilidad líder,
// gráfica con rangos, celdas de resultado y el único botón dorado de la pantalla.
export function DeportesHero({ market, series, historyLoading, delta, range, onRange, onTrade }: DeportesHeroProps) {
  const { t } = useTranslation()
  const diff = useCountdown(market.endsAt)
  const { text: countdown, urgent } = formatCountdown(diff)
  const [chartRef, chartW] = useElementWidth()
  const [copied, setCopied] = useState(false)
  const isMulti = market.marketType === 'multi'
  const outs = isMulti ? [...(market.outcomes ?? [])].sort((a, b) => b.price - a.price) : []
  const leader = outs[0] ?? null
  const headline = isMulti ? Math.round(leader?.price ?? 0) : market.yesPrice
  const cells = outs.slice(0, 3)
  const rest = Math.max(0, outs.length - cells.length)
  const hasChart = series.some(s => s.data.length > 1)

  const deltaText = delta === null ? null
    : delta > 0 ? t('deportes.deltaUp', { count: delta })
    : delta < 0 ? t('deportes.deltaDown', { count: Math.abs(delta) })
    : t('deportes.deltaFlat')
  const deltaColor = delta === null || delta === 0 ? undefined : delta > 0 ? 'var(--green)' : 'var(--red)'

  const share = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/m/${market.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card" style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge>{t('home.featuredMarket')}</Badge>
          {market.subcategory && <Badge tone="category" color="var(--cat-gold)" bg="var(--cat-gold-bg)">{market.subcategory}</Badge>}
          <span className="meta-label num">{t('card.vol')} {formatVolume(market.volume)} PT · {t('politica.trades', { count: market.numTrades ?? 0 })}</span>
        </div>
        <span className="meta-label num" style={{ display: 'flex', alignItems: 'center', gap: 6, color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>
          <Icon name="clock" size={13} />
          {countdown}
        </span>
      </div>

      {/* Pregunta + probabilidad líder */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <MarketThumb market={market} size={56} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{market.question}</h2>
          </Link>
          {isMulti && leader && (
            <div className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t('deportes.leader')}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{leader.label}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="num" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: isMulti ? 'var(--text-primary)' : probColor(market.yesPrice) }}>
            {probText(headline, market.status)}
          </div>
          {deltaText && (
            <div className="meta-label num" style={{ marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, color: deltaColor }}>
              {delta !== null && delta !== 0 && <Icon name={delta > 0 ? 'arrow-up-right' : 'arrow-down-right'} size={12} strokeWidth={2} />}
              {deltaText}
            </div>
          )}
        </div>
      </div>

      {/* Gráfica */}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {series.map(s => (
            <span key={s.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', minWidth: 0 }}>
              <span style={{ width: 8, height: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{s.label}</span>
            </span>
          ))}
        </div>
        <Tabs<ChartRange>
          size="sm"
          ariaLabel={t('deportes.historyTitle')}
          items={HERO_RANGES.map(r => ({ key: r, label: r === 'all' ? t('market.periodAll') : RANGE_LABELS[r] }))}
          active={range}
          onChange={onRange}
        />
      </div>

      {/* Celdas de resultado */}
      <div className="dep-cells" style={!isMulti ? { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } : undefined}>
        {isMulti ? cells.map(o => {
          const mark = outcomeLogo(o, market.subcategory, market.id)
          return (
            <div key={o.outcome_key} className={`dep-cell${mark ? ' has-mark' : ''}`}>
              {mark && <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={22} />}
              <span className="dep-cell-label">{o.label}</span>
              <span className="dep-cell-price num">{probText(o.price, market.status)}</span>
            </div>
          )
        }) : (
          <>
            <div className="dep-cell price-yes" style={{ border: 'none' }}>
              <span className="dep-cell-label">{t('common.yes')}</span>
              <span className="dep-cell-price num">{probText(market.yesPrice, market.status)}</span>
            </div>
            <div className="dep-cell price-no" style={{ border: 'none' }}>
              <span className="dep-cell-label">{t('common.no')}</span>
              <span className="dep-cell-price num">{probText(100 - market.yesPrice, market.status)}</span>
            </div>
          </>
        )}
      </div>
      {rest > 0 && (
        <Link to={`/mercado/${market.id}`} className="meta-label" style={{ marginTop: -6 }}>{t('carousel.moreOutcomes', { count: rest })}</Link>
      )}

      {/* Acciones: Operar es el único dorado de la pantalla */}
      <div className="dep-hero-cta">
        <button type="button" className="btn btn-primary" onClick={onTrade}>{t('deportes.trade')}</button>
        <Link to={`/mercado/${market.id}`} className="btn btn-secondary">{t('deportes.viewMarket')}</Link>
        <button type="button" className="icon-btn" onClick={share} aria-label={t('common.copyLink')} title={copied ? t('common.copied') : t('common.copyLink')}>
          <Icon name={copied ? 'check' : 'share'} size={18} />
        </button>
      </div>
    </div>
  )
}
