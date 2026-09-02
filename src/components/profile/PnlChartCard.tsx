import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FullChart } from '../SparkChart'
import { formatPnl } from '../../lib/format'
import type { PricePoint } from '../../types'

type Period = '1d' | '1w' | '1m' | 'all'

// El chart grafica el SALDO diario (points-history); la cifra grande es el
// P&L real (points + invertido − 10000, misma fórmula que el backend).
interface Props {
  pointsHistory?: PricePoint[]   // omitido en perfil público (el ledger es privado)
  pnl: number
  subStats?: { label: string; value: string; color?: string }[]
}

const SLICES: Record<Period, number | null> = { '1d': 2, '1w': 8, '1m': 31, all: null }

export function PnlChartCard({ pointsHistory, pnl, subStats }: Props) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('all')

  const hasChart = !!pointsHistory && pointsHistory.length >= 2
  const slice = hasChart
    ? (SLICES[period] ? pointsHistory!.slice(-SLICES[period]!) : pointsHistory!)
    : []
  const periodDelta = slice.length >= 2 ? slice[slice.length - 1].price - slice[0].price : 0

  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)'
  const chartColor = periodDelta >= 0 ? 'var(--green)' : 'var(--red)'

  const periods: { key: Period; label: string }[] = [
    { key: '1d', label: t('profile.period1d') },
    { key: '1w', label: t('profile.period1w') },
    { key: '1m', label: t('profile.period1m') },
    { key: 'all', label: t('profile.periodAll') },
  ]

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pnlColor, flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('profile.pnlLabel')}
            </span>
          </div>
          <div className="font-mono" style={{
            fontSize: '2.4rem', fontWeight: 700, color: pnlColor,
            letterSpacing: '-0.04em', lineHeight: 1.15, marginTop: 6,
          }}>
            {formatPnl(pnl)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
            {t('profile.pnlAllTime')}
            {hasChart && period !== 'all' && slice.length >= 2 && (
              <span className="font-mono" style={{ color: chartColor, marginLeft: 8, fontWeight: 700 }}>
                {formatPnl(periodDelta)}
              </span>
            )}
          </div>
        </div>

        {hasChart && (
          <div className="pill-group" style={{ display: 'flex', gap: 2 }}>
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`period-pill${period === p.key ? ' active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasChart ? (
        <FullChart data={slice} height={180} color={chartColor} valueSuffix=" PT" label="PT" />
      ) : subStats && subStats.length > 0 ? (
        <div style={{ display: 'flex', marginTop: 'auto' }}>
          {subStats.map((s, i) => (
            <div key={s.label} style={{
              flex: 1, minWidth: 0, paddingLeft: i === 0 ? 0 : 18,
              borderLeft: i === 0 ? 'none' : '1px solid var(--border-subtle)',
            }}>
              <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color ?? 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {s.value}
              </div>
              <div className="meta-label" style={{ marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
