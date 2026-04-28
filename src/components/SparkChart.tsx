import React, { useMemo } from 'react'
import type { PricePoint } from '../types'

interface SparkChartProps {
  data: PricePoint[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  showAxes?: boolean
  showTooltip?: boolean
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
    if (data.length < 2) return { path: '', area: '', lineColor: '#00d084', isUp: true }
    const prices = data.map(d => d.price)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 1
    const pad = 4
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
    const lineColor = color || (isUp ? '#00d084' : '#ff4560')
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
        <>
          <line x1="4" y1={height - 4} x2={width - 4} y2={height - 4} stroke="var(--border-subtle)" strokeWidth="1" />
        </>
      )}
      {showArea && (
        <path
          d={points.area}
          fill={points.lineColor}
          opacity="0.12"
        />
      )}
      <path
        d={points.path}
        fill="none"
        stroke={points.lineColor}
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
}

export function FullChart({ data, height = 200, color }: FullChartProps) {
  const { path, area, lineColor, ticks } = useMemo(() => {
    if (data.length < 2) return { path: '', area: '', lineColor: '#00d084', isUp: true, ticks: [] }
    const prices = data.map(d => d.price)
    const minP = Math.max(0, Math.min(...prices) - 5)
    const maxP = Math.min(100, Math.max(...prices) + 5)
    const range = maxP - minP || 1

    const padL = 40
    const padR = 16
    const padT = 16
    const padB = 28
    const w = 700 - padL - padR
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
    const lineColor = color || (isUp ? '#00d084' : '#ff4560')

    // Y axis ticks
    const tickValues = [minP, (minP + maxP) / 2, maxP].map(v => ({
      y: toY(v).toFixed(1),
      label: `${Math.round(v)}%`,
    }))

    // X axis ticks (every ~10 items)
    const step = Math.floor(data.length / 6)
    const xTicks = data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d, _, arr) => ({
        x: toX(data.indexOf(d)).toFixed(1),
        label: d.date.slice(5), // MM-DD
      }))
      .slice(0, 7)

    return { path, area, lineColor, isUp, ticks: { y: tickValues, x: xTicks } }
  }, [data, height, color])

  const currentPrice = data[data.length - 1]?.price ?? 0

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 700 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Grid lines */}
        {(ticks as any)?.y?.map((t: any) => (
          <line
            key={t.label}
            x1="40"
            y1={t.y}
            x2="684"
            y2={t.y}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area */}
        <path d={area} fill={lineColor} opacity="0.1" />

        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
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
          const w = 700 - padL - padR
          const h = height - padT - padB
          const x = (padL + w).toFixed(1)
          const y = (padT + h - ((data[data.length - 1].price - minP) / range) * h).toFixed(1)
          return (
            <circle cx={x} cy={y} r="4" fill={lineColor} />
          )
        })()}

        {/* Y axis labels */}
        {(ticks as any)?.y?.map((t: any) => (
          <text
            key={t.label}
            x="36"
            y={Number(t.y) + 4}
            textAnchor="end"
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {t.label}
          </text>
        ))}

        {/* X axis labels */}
        {(ticks as any)?.x?.map((t: any) => (
          <text
            key={t.x}
            x={t.x}
            y={height - 6}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="JetBrains Mono"
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
