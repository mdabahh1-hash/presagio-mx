import React, { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { PricePoint } from '../types'

// ── MultiLineChart ─────────────────────────────────────────────────────────

// Tokens --chart-N de index.css: cambian con el tema. Ojo: los var() de CSS
// solo resuelven vía `style`, no como atributo de presentación SVG.
const MULTI_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
]

interface MultiSeries {
  outcome_key: string
  label: string
  data: PricePoint[]
}

export function MultiLineChart({ series, height = 220, viewW = 700 }: { series: MultiSeries[]; height?: number; viewW?: number }) {
  const { t } = useTranslation()
  const chart = useMemo(() => {
    const padL = 44, padR = 16, padT = 16, padB = 44
    const W = viewW, H = height
    const cW = W - padL - padR
    const cH = H - padT - padB

    // Collect all unique dates across all series
    const dateSet = new Set<string>()
    for (const s of series) s.data.forEach(p => dateSet.add(p.date))
    const dates = Array.from(dateSet).sort()
    const n = dates.length
    if (n === 0) return null

    const toX = (i: number) => n === 1 ? padL + cW / 2 : padL + (i / (n - 1)) * cW
    const toY = (p: number) => padT + cH - (p / 100) * cH

    const paths = series.map((s, si) => {
      const color = MULTI_COLORS[si % MULTI_COLORS.length]

      if (n === 1) {
        // Only one data point — draw a horizontal flat line across the chart
        const price = s.data[0]?.price ?? null
        if (price === null) return { d: '', color, dotX: null, dotY: null, lastPrice: null }
        const y = toY(price).toFixed(1)
        const d = `M${padL.toFixed(1)},${y} L${(padL + cW).toFixed(1)},${y}`
        return { d, color, dotX: padL + cW, dotY: toY(price), lastPrice: price }
      }

      const pts = dates.map(d => {
        const match = s.data.find(p => p.date === d)
        return match ? match.price : null
      })
      // Build path segments (skip nulls with M/L)
      let d = ''
      let inPath = false
      for (let i = 0; i < n; i++) {
        if (pts[i] === null) { inPath = false; continue }
        d += `${inPath ? 'L' : 'M'}${toX(i).toFixed(1)},${toY(pts[i]!).toFixed(1)} `
        inPath = true
      }
      const lastReal = [...pts].reverse().find(p => p !== null)
      const lastIdx = pts.lastIndexOf(lastReal ?? null)
      const dotX = lastIdx >= 0 ? toX(lastIdx) : null
      const dotY = lastReal !== null && lastReal !== undefined ? toY(lastReal) : null
      return { d, color, dotX, dotY, lastPrice: lastReal }
    })

    // Y ticks at 0, 25, 50, 75, 100
    const yTicks = [0, 25, 50, 75, 100].map(v => ({ y: toY(v).toFixed(1), label: `${v}%` }))

    // X ticks — spread ~6 across dates
    const isTimestamp = dates[0]?.includes('T')
    const allSameDay = isTimestamp ? dates.every(d => d.slice(0, 10) === dates[0].slice(0, 10)) : false
    const formatLabel = (d: string) => {
      if (!isTimestamp) return d.slice(5)
      if (allSameDay) return d.slice(11, 16)
      return d.slice(5, 10) + ' ' + d.slice(11, 16)
    }
    const step = Math.max(1, Math.floor(n / 6))
    const xTicks = dates
      .map((d, i) => ({ x: toX(i).toFixed(1), label: formatLabel(d), i }))
      .filter(({ i }) => i % step === 0 || i === n - 1)
      .slice(0, 7)

    return { paths, yTicks, xTicks, W, H }
  }, [series, height, viewW])

  if (!chart) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
        {t('common.noHistory')}
      </div>
    )
  }

  const { paths, yTicks, xTicks, W, H } = chart

  return (
    <div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          {/* Grid lines */}
          {yTicks.map(t => (
            <line key={t.label} x1="44" y1={t.y} x2={W - 16} y2={t.y}
              stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4,6" />
          ))}
          {/* Lines */}
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" style={{ stroke: p.color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {/* Dots at last point */}
          {paths.map((p, i) => p.dotX !== null && p.dotY !== null && (
            <g key={`dot-${i}`}>
              <circle cx={p.dotX} cy={p.dotY} r="5" style={{ fill: p.color }} opacity="0.2" />
              <circle cx={p.dotX} cy={p.dotY} r="3" style={{ fill: p.color }} />
            </g>
          ))}
          {/* Y labels */}
          {yTicks.map(t => (
            <text key={t.label} x="40" y={Number(t.y) + 4} textAnchor="end"
              fill="var(--text-tertiary)" fontSize="10" fontFamily="DM Mono">{t.label}</text>
          ))}
          {/* X labels */}
          {xTicks.map(t => (
            <text key={t.x} x={t.x} y={H - 6} textAnchor="middle"
              fill="var(--text-tertiary)" fontSize="10" fontFamily="DM Mono">{t.label}</text>
          ))}
        </svg>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
        {series.map((s, i) => {
          const color = MULTI_COLORS[i % MULTI_COLORS.length]
          const last = paths[i].lastPrice
          return (
            <div key={s.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: 'DM Mono', fontWeight: 700, color }}>
                {last !== null && last !== undefined ? `${last.toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SparkChartProps {
  data: PricePoint[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  showAxes?: boolean
  className?: string
}

export function SparkChart({
  data,
  width = 120,
  height = 40,
  color,
  showArea = true,
  showAxes = false,
  className = '',
}: SparkChartProps) {
  const points = useMemo(() => {
    if (data.length < 2) return { path: '', area: '', lineColor: 'var(--green)', isUp: true }
    const prices = data.map(d => d.price)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 1
    const pad = 3
    const w = width - pad * 2
    const h = height - pad * 2

    const toX = (i: number) => pad + (i / (data.length - 1)) * w
    const toY = (p: number) => pad + h - ((p - minP) / range) * h

    const pathParts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`)
    const path = pathParts.join(' ')
    const lastX = toX(data.length - 1).toFixed(1)
    const firstX = toX(0).toFixed(1)
    const bottom = (pad + h).toFixed(1)
    const area = `${path} L${lastX},${bottom} L${firstX},${bottom} Z`

    const isUp = data[data.length - 1].price >= data[0].price
    const lineColor = color || (isUp ? 'var(--green)' : 'var(--red)')
    return { path, area, lineColor, isUp }
  }, [data, width, height, color])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      {showAxes && (
        <line x1="3" y1={height - 3} x2={width - 3} y2={height - 3} stroke="var(--border-subtle)" strokeWidth="1" />
      )}
      {showArea && (
        <path d={points.area} style={{ fill: points.lineColor }} opacity="0.14" />
      )}
      <path
        d={points.path}
        fill="none"
        style={{ stroke: points.lineColor }}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface FullChartProps {
  data: PricePoint[]
  height?: number
  color?: string
  viewW?: number
}

export function FullChart({ data, height = 200, color, viewW = 700 }: FullChartProps) {
  const { path, area, lineColor, ticks } = useMemo(() => {
    if (data.length < 2) return { path: '', area: '', lineColor: 'var(--green)', isUp: true, ticks: [] }
    const prices = data.map(d => d.price)
    const minP = Math.max(0, Math.min(...prices) * 0.95)
    const maxP = Math.max(...prices) * 1.05
    const range = maxP - minP || 1

    const padL = 40
    const padR = 16
    const padT = 16
    const padB = 28
    const w = viewW - padL - padR
    const h = height - padT - padB

    const toX = (i: number) => padL + (i / (data.length - 1)) * w
    const toY = (p: number) => padT + h - ((p - minP) / range) * h

    const pathParts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`)
    const path = pathParts.join(' ')
    const lastX = toX(data.length - 1).toFixed(1)
    const firstX = toX(0).toFixed(1)
    const bottom = (padT + h).toFixed(1)
    const area = `${path} L${lastX},${bottom} L${firstX},${bottom} Z`

    const isUp = data[data.length - 1].price >= data[0].price
    const lineColor = color || (isUp ? 'var(--green)' : 'var(--red)')

    const tickValues = [minP, (minP + maxP) / 2, maxP].map(v => ({
      y: toY(v).toFixed(1),
      label: `${Math.round(v)}`,
    }))

    const step = Math.max(1, Math.floor(data.length / 6))
    const xTicks = data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map(d => ({
        x: toX(data.indexOf(d)).toFixed(1),
        label: d.date.slice(5),
      }))
      .slice(0, 7)

    return { path, area, lineColor, isUp, ticks: { y: tickValues, x: xTicks } }
  }, [data, height, color, viewW])

  const gradientId = useId()

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${viewW} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: lineColor }} stopOpacity="0.25" />
            <stop offset="100%" style={{ stopColor: lineColor }} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {(ticks as any)?.y?.map((t: any) => (
          <line
            key={t.label}
            x1="40" y1={t.y} x2={viewW - 16} y2={t.y}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="4,6"
          />
        ))}

        {/* Area with gradient */}
        <path d={area} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={path}
          fill="none"
          style={{ stroke: lineColor }}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Last point dot */}
        {data.length > 0 && (() => {
          const prices = data.map(d => d.price)
          const minP = Math.max(0, Math.min(...prices) - 5)
          const maxP = Math.min(100, Math.max(...prices) + 5)
          const range = maxP - minP || 1
          const padL = 40, padR = 16, padT = 16, padB = 28
          const w = viewW - padL - padR
          const h = height - padT - padB
          const x = (padL + w).toFixed(1)
          const y = (padT + h - ((data[data.length - 1].price - minP) / range) * h).toFixed(1)
          return (
            <>
              <circle cx={x} cy={y} r="6" style={{ fill: lineColor }} opacity="0.2" />
              <circle cx={x} cy={y} r="3.5" style={{ fill: lineColor }} />
            </>
          )
        })()}

        {/* Y axis labels */}
        {(ticks as any)?.y?.map((t: any) => (
          <text key={t.label} x="36" y={Number(t.y) + 4} textAnchor="end"
            fill="var(--text-tertiary)" fontSize="10" fontFamily="DM Mono">
            {t.label}
          </text>
        ))}

        {/* X axis labels */}
        {(ticks as any)?.x?.map((t: any) => (
          <text key={t.x} x={t.x} y={height - 6} textAnchor="middle"
            fill="var(--text-tertiary)" fontSize="10" fontFamily="DM Mono">
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
