import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { marketsApi, type ApiPricePoint } from '../../lib/api'
import { MultiLineChart, outcomeColor, type MultiSeries } from '../SparkChart'
import { Tabs } from '../Tabs'
import { Icon } from '../Icon'
import { filterRange, splitHistory, RANGE_LABELS, type ChartRange } from '../../lib/chartRange'
import { orderOutcomes } from '../../lib/outcomeOrder'
import { cleanLabel } from '../../lib/mapMarket'
import { useElementWidth } from '../../lib/useElementWidth'

const RANGES: ChartRange[] = ['1w', '1m', 'all']
const CHART_H = 240

// Panel: las opciones líderes de un multi en el tiempo (90 días). Colores por índice de
// orderOutcomes, igual que la gráfica del detalle. Sin historial no se monta.
export function OpcionesChart({ market, title, top = 5 }: { market: Market; title: string; top?: number }) {
  const { t } = useTranslation()
  const [hist, setHist] = useState<ApiPricePoint[] | null>(null)
  const [range, setRange] = useState<ChartRange>('all')
  const [ref, width] = useElementWidth()

  useEffect(() => {
    let alive = true
    marketsApi.history(market.id, 90).then(h => { if (alive) setHist(h) }).catch(() => { if (alive) setHist([]) })
    return () => { alive = false }
  }, [market.id])

  const series = useMemo<MultiSeries[]>(() => {
    if (!hist) return []
    const { byOutcome } = splitHistory(hist)
    const ordered = orderOutcomes(market.outcomes ?? [])
    const leaders = new Set([...ordered].sort((a, b) => b.price - a.price).slice(0, top).map(o => o.outcome_key))
    return ordered.flatMap((o, i) => leaders.has(o.outcome_key) && byOutcome[o.outcome_key]?.length
      ? [{ outcome_key: o.outcome_key, label: cleanLabel(o.label), data: filterRange(byOutcome[o.outcome_key], range), color: outcomeColor(i) }]
      : [])
  }, [hist, market.outcomes, range, top])

  if (hist && series.length === 0) return null

  return (
    <div className="card" style={{ padding: '16px 18px 14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
        <h3 className="section-title">{title}</h3>
        <Tabs<ChartRange>
          size="sm"
          ariaLabel={title}
          items={RANGES.map(r => ({ key: r, label: r === 'all' ? t('market.periodAll') : RANGE_LABELS[r] }))}
          active={range}
          onChange={setRange}
        />
      </div>
      {title !== market.question && <p className="meta-label" style={{ margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market.question}</p>}
      <div ref={ref} style={{ minWidth: 0 }}>
        {hist ? (
          <MultiLineChart series={series} height={CHART_H} viewW={width || 700} />
        ) : (
          <div className="skeleton" style={{ height: CHART_H, background: 'var(--bg-surface)', border: 'none' }} />
        )}
      </div>
      <Link to={`/mercado/${market.id}`} className="meta-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        {t('panel.verMercado')}<Icon name="arrow-right" size={12} />
      </Link>
    </div>
  )
}
