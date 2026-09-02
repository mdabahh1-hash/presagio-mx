import React, { useId, useMemo, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import type { PricePoint } from '../types'

// ── Colores por outcome ─────────────────────────────────────────────────────

// Tokens --chart-N de index.css: cambian con el tema. Ojo: los var() de CSS
// solo resuelven vía `style`, no como atributo de presentación SVG.
export const MULTI_COLORS = [
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

/** Color estable para el outcome en la posición `i` de la lista ordenada. */
export const outcomeColor = (i: number) => MULTI_COLORS[i % MULTI_COLORS.length]

// ── Escala temporal + formato de etiquetas ──────────────────────────────────

const DAY_MS = 86_400_000

function locale() {
  return i18n.language.startsWith('en') ? 'en-US' : 'es-MX'
}

/** Tiempos (ms) de cada punto; si alguna fecha no parsea, cae a índices. */
function timesOf(data: PricePoint[]): { ts: number[]; real: boolean } {
  const ts = data.map(p => Date.parse(p.date))
  if (ts.some(Number.isNaN)) return { ts: data.map((_, i) => i), real: false }
  return { ts, real: true }
}

function axisFormatter(spanMs: number, real: boolean) {
  if (!real) return (_t: number, raw: string) => raw.slice(5)
  const opts: Intl.DateTimeFormatOptions =
    spanMs < 2 * DAY_MS ? { hour: '2-digit', minute: '2-digit' }
    : spanMs < 400 * DAY_MS ? { day: 'numeric', month: 'short' }
    : { month: 'short', year: '2-digit' }
  const fmt = new Intl.DateTimeFormat(locale(), opts)
  return (t: number) => fmt.format(new Date(t))
}

function tooltipDate(t: number, raw: string, spanMs: number, real: boolean): string {
  if (!real) return raw
  const opts: Intl.DateTimeFormatOptions = spanMs < 2 * DAY_MS
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Intl.DateTimeFormat(locale(), opts).format(new Date(t))
}

/** Índice del punto con tiempo más cercano a `t` (ts ordenado ascendente). */
function nearestIndex(ts: number[], t: number): number {
  let lo = 0, hi = ts.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ts[mid] < t) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(ts[lo - 1] - t) <= Math.abs(ts[lo] - t)) return lo - 1
  return lo
}

/** Último índice con ts[i] <= t (valor vigente), o -1. */
function lastIndexAtOrBefore(ts: number[], t: number): number {
  let lo = 0, hi = ts.length - 1, ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (ts[mid] <= t) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

// ── Hover compartido ────────────────────────────────────────────────────────

/** Convierte la posición del mouse/touch a coordenada X del viewBox. */
function useChartHover(viewW: number, padL: number, cW: number, enabled: boolean) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const move = useCallback((clientX: number) => {
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    const x = ((clientX - rect.left) / rect.width) * viewW
    setHoverX(Math.max(padL, Math.min(padL + cW, x)))
  }, [viewW, padL, cW])

  const handlers = enabled ? {
    onMouseMove: (e: React.MouseEvent) => move(e.clientX),
    onMouseLeave: () => setHoverX(null),
    onTouchStart: (e: React.TouchEvent) => move(e.touches[0].clientX),
    onTouchMove: (e: React.TouchEvent) => move(e.touches[0].clientX),
    onTouchEnd: () => setHoverX(null),
  } : {}

  return { svgRef, hoverX, handlers }
}

interface TooltipRow { color: string; label: string; value: string }

function ChartTooltip({ xView, viewW, title, rows }: { xView: number; viewW: number; title: string; rows: TooltipRow[] }) {
  const pct = (xView / viewW) * 100
  const flip = pct > 60
  return (
    <div style={{
      position: 'absolute', top: 8,
      left: flip ? undefined : `calc(${pct}% + 12px)`,
      right: flip ? `calc(${100 - pct}% + 12px)` : undefined,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-pop)', borderRadius: 8,
      padding: '8px 10px', pointerEvents: 'none', zIndex: 2, minWidth: 120,
    }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginBottom: rows.length ? 6 : 0, whiteSpace: 'nowrap' }}>
        {title}
      </div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{r.label}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── MultiLineChart ─────────────────────────────────────────────────────────

export interface MultiSeries {
  outcome_key: string
  label: string
  data: PricePoint[]
  /** Color estable (p. ej. `outcomeColor(i)` por posición en la lista completa). */
  color?: string
}

export function MultiLineChart({ series, height = 220, viewW = 700, interactive = true, showLegend = true }: {
  series: MultiSeries[]; height?: number; viewW?: number; interactive?: boolean; showLegend?: boolean
}) {
  const { t } = useTranslation()
  const padL = 44, padR = 16, padT = 16, padB = 44
  const W = viewW, H = height
  const cW = W - padL - padR
  const cH = H - padT - padB

  const chart = useMemo(() => {
    const prepared = series.map((s, si) => ({
      ...s,
      color: s.color ?? MULTI_COLORS[si % MULTI_COLORS.length],
      times: timesOf(s.data),
    }))
    const real = prepared.every(p => p.times.real)
    const all = prepared.flatMap(p => p.times.ts)
    if (all.length === 0) return null
    const t0 = Math.min(...all), t1 = Math.max(...all)
    const span = t1 - t0
    const toX = (tm: number) => span === 0 ? padL + cW / 2 : padL + ((tm - t0) / span) * cW
    const toY = (p: number) => padT + cH - (p / 100) * cH

    const paths = prepared.map(s => {
      const { ts } = s.times
      if (ts.length === 0) return { d: '', color: s.color, dotX: null as number | null, dotY: null as number | null, lastPrice: null as number | null }
      if (span === 0 || ts.length === 1) {
        // Un solo instante — línea plana a lo ancho
        const price = s.data[ts.length - 1].price
        const y = toY(price).toFixed(1)
        return { d: `M${padL.toFixed(1)},${y} L${(padL + cW).toFixed(1)},${y}`, color: s.color, dotX: padL + cW, dotY: toY(price), lastPrice: price }
      }
      const d = s.data.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(ts[i]).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ')
      const last = s.data[s.data.length - 1]
      return { d, color: s.color, dotX: toX(ts[ts.length - 1]), dotY: toY(last.price), lastPrice: last.price }
    })

    const yTicks = [0, 25, 50, 75, 100].map(v => ({ y: toY(v).toFixed(1), label: `${v}%` }))
    const fmt = axisFormatter(span, real)
    // ~1 etiqueta por cada 90px de ancho: en columnas angostas (móvil) 6
    // etiquetas de fecha se enciman.
    const nTicks = Math.max(2, Math.min(6, Math.floor(cW / 90)))
    const xTicks = span === 0
      ? []
      : Array.from({ length: nTicks + 1 }, (_, i) => {
          const tm = t0 + (span * i) / nTicks
          return { x: toX(tm).toFixed(1), label: fmt(tm, ''), key: i }
        })

    return { prepared, paths, yTicks, xTicks, W, H, t0, t1, span, real, toX, toY }
  }, [series, height, viewW, padL, cW, cH, padT, W, H])

  const { svgRef, hoverX, handlers } = useChartHover(viewW, padL, cW, interactive && !!chart && chart.span > 0)

  if (!chart) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
        {t('common.noHistory')}
      </div>
    )
  }

  const { prepared, paths, yTicks, xTicks, t0, span, real, toX, toY } = chart

  // Hover: valor vigente de cada serie en el instante apuntado
  let hover: { x: number; title: string; rows: TooltipRow[]; dots: { x: number; y: number; color: string }[] } | null = null
  if (hoverX !== null && span > 0) {
    const tm = t0 + ((hoverX - padL) / cW) * span
    const rows: TooltipRow[] = []
    const dots: { x: number; y: number; color: string }[] = []
    let rawDate = ''
    for (const s of prepared) {
      const i = lastIndexAtOrBefore(s.times.ts, tm)
      if (i < 0) continue
      const p = s.data[i]
      rows.push({ color: s.color, label: s.label, value: `${p.price.toFixed(1)}%` })
      dots.push({ x: toX(tm), y: toY(p.price), color: s.color })
      if (!rawDate) rawDate = p.date
    }
    hover = { x: toX(tm), title: tooltipDate(tm, rawDate, span, real), rows, dots }
  }

  return (
    <div>
      <div style={{ width: '100%', position: 'relative' }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', cursor: interactive ? 'crosshair' : undefined, touchAction: interactive ? 'pan-y' : undefined }}
          {...handlers}>
          {/* Grid lines */}
          {yTicks.map(tk => (
            <line key={tk.label} x1={padL} y1={tk.y} x2={W - padR} y2={tk.y}
              stroke="var(--chart-grid)" strokeWidth="1" />
          ))}
          {/* Lines */}
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" style={{ stroke: p.color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              opacity={hover ? 0.85 : 1} />
          ))}
          {/* Dots at last point */}
          {paths.map((p, i) => p.dotX !== null && p.dotY !== null && (
            <g key={`dot-${i}`}>
              <circle cx={p.dotX} cy={p.dotY} r="5" style={{ fill: p.color }} opacity="0.2" />
              <circle cx={p.dotX} cy={p.dotY} r="3" style={{ fill: p.color }} />
            </g>
          ))}
          {/* Crosshair */}
          {hover && (
            <g>
              <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + cH} stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3,4" />
              {hover.dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="4" style={{ fill: d.color }} stroke="var(--bg-elevated)" strokeWidth="1.5" />
              ))}
            </g>
          )}
          {/* Y labels */}
          {yTicks.map(tk => (
            <text key={tk.label} x={padL - 4} y={Number(tk.y) + 4} textAnchor="end"
              fill="var(--text-tertiary)" fontSize="10" fontFamily="Inter, system-ui, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{tk.label}</text>
          ))}
          {/* X labels */}
          {xTicks.map(tk => (
            <text key={tk.key} x={tk.x} y={H - 6} textAnchor={tk.key === 0 ? 'start' : tk.key === xTicks.length - 1 ? 'end' : 'middle'}
              fill="var(--text-tertiary)" fontSize="10" fontFamily="Inter, system-ui, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{tk.label}</text>
          ))}
        </svg>
        {hover && <ChartTooltip xView={hover.x} viewW={W} title={hover.title} rows={hover.rows} />}
      </div>
      {/* Legend */}
      {showLegend && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
        {prepared.map((s, i) => {
          const last = paths[i].lastPrice
          return (
            <div key={s.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color }}>
                {last !== null && last !== undefined ? `${last.toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>}
    </div>
  )
}

// ── SparkChart (mini, sin ejes) ─────────────────────────────────────────────

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

// ── FullChart (binario / una serie con ejes) ───────────────────────────────

interface FullChartProps {
  data: PricePoint[]
  height?: number
  color?: string
  viewW?: number
  /** Crosshair + tooltip al pasar el mouse. */
  interactive?: boolean
  /** Sufijo del valor en el tooltip ('%' para probabilidades, ' PT' para puntos). */
  valueSuffix?: string
  /** Etiqueta de la fila del tooltip (p. ej. "Sí"). */
  label?: string
}

export function FullChart({ data, height = 200, color, viewW = 700, interactive = true, valueSuffix = '%', label }: FullChartProps) {
  const padL = 40, padR = 16, padT = 16, padB = 28
  const w = viewW - padL - padR
  const h = height - padT - padB

  const chart = useMemo(() => {
    if (data.length < 2) return null
    const prices = data.map(d => d.price)
    const minP = Math.max(0, Math.min(...prices) * 0.95)
    // Probabilidades: el eje nunca pasa de 100%
    const maxP = valueSuffix === '%' ? Math.min(100, Math.max(...prices) * 1.05) : Math.max(...prices) * 1.05
    const range = maxP - minP || 1

    const { ts, real } = timesOf(data)
    const t0 = ts[0], t1 = ts[ts.length - 1]
    const span = t1 - t0
    const toX = (tm: number) => span === 0 ? padL + w / 2 : padL + ((tm - t0) / span) * w
    const toY = (p: number) => padT + h - ((p - minP) / range) * h

    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(ts[i]).toFixed(1)},${toY(d.price).toFixed(1)}`).join(' ')
    const lastX = toX(ts[ts.length - 1]).toFixed(1)
    const firstX = toX(ts[0]).toFixed(1)
    const bottom = (padT + h).toFixed(1)
    const area = `${path} L${lastX},${bottom} L${firstX},${bottom} Z`

    const isUp = data[data.length - 1].price >= data[0].price
    const lineColor = color || (isUp ? 'var(--green)' : 'var(--red)')

    const yTicks = [minP, (minP + maxP) / 2, maxP].map(v => ({ y: toY(v).toFixed(1), label: `${Math.round(v)}` }))

    const fmt = axisFormatter(span, real)
    const nTicks = Math.max(2, Math.min(6, Math.floor(w / 90)))
    const xTicks = span === 0
      ? []
      : real
        ? Array.from({ length: nTicks + 1 }, (_, i) => {
            const tm = t0 + (span * i) / nTicks
            return { x: toX(tm).toFixed(1), label: fmt(tm, ''), key: i }
          })
        : data
            .map((d, i) => ({ x: toX(ts[i]).toFixed(1), label: fmt(ts[i], d.date), key: i }))
            .filter(({ key }) => key % Math.max(1, Math.floor(data.length / 6)) === 0 || key === data.length - 1)
            .slice(0, 7)

    // Last-point dot on the SAME scale as the line
    const dot = { x: lastX, y: toY(data[data.length - 1].price).toFixed(1) }

    return { path, area, lineColor, yTicks, xTicks, dot, ts, real, t0, span, toX, toY }
  }, [data, height, color, viewW, padL, w, h, padT, valueSuffix])

  const gradientId = useId()
  const { svgRef, hoverX, handlers } = useChartHover(viewW, padL, w, interactive && !!chart && chart.span > 0)

  if (!chart) {
    return <div style={{ height }} />
  }
  const { path, area, lineColor, yTicks, xTicks, dot, ts, real, t0, span, toX, toY } = chart

  let hover: { x: number; y: number; title: string; value: string } | null = null
  if (hoverX !== null && span > 0) {
    const tm = t0 + ((hoverX - padL) / w) * span
    const i = nearestIndex(ts, tm)
    const p = data[i]
    hover = {
      x: toX(ts[i]), y: toY(p.price),
      title: tooltipDate(ts[i], p.date, span, real),
      value: `${valueSuffix === '%' ? p.price.toFixed(1) : Math.round(p.price).toLocaleString(locale())}${valueSuffix}`,
    }
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${viewW} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', cursor: interactive ? 'crosshair' : undefined, touchAction: interactive ? 'pan-y' : undefined }}
        {...handlers}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: lineColor }} stopOpacity="0.14" />
            <stop offset="100%" style={{ stopColor: lineColor }} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map(tk => (
          <line key={tk.label} x1={padL} y1={tk.y} x2={viewW - padR} y2={tk.y}
            stroke="var(--chart-grid)" strokeWidth="1" />
        ))}

        {/* Area with gradient */}
        <path d={area} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={path} fill="none" style={{ stroke: lineColor }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Last point dot */}
        <circle cx={dot.x} cy={dot.y} r="6" style={{ fill: lineColor }} opacity="0.2" />
        <circle cx={dot.x} cy={dot.y} r="3.5" style={{ fill: lineColor }} />

        {/* Crosshair */}
        {hover && (
          <g>
            <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + h} stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3,4" />
            <circle cx={hover.x} cy={hover.y} r="4.5" style={{ fill: lineColor }} stroke="var(--bg-elevated)" strokeWidth="1.5" />
          </g>
        )}

        {/* Y axis labels */}
        {yTicks.map(tk => (
          <text key={tk.label} x={padL - 4} y={Number(tk.y) + 4} textAnchor="end"
            fill="var(--text-tertiary)" fontSize="10" fontFamily="Inter, system-ui, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>
            {tk.label}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map(tk => (
          <text key={tk.key} x={tk.x} y={height - 6}
            textAnchor={tk.key === 0 ? 'start' : tk.key === xTicks[xTicks.length - 1].key ? 'end' : 'middle'}
            fill="var(--text-tertiary)" fontSize="10" fontFamily="Inter, system-ui, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>
            {tk.label}
          </text>
        ))}
      </svg>
      {hover && (
        <ChartTooltip xView={hover.x} viewW={viewW} title={hover.title}
          rows={[{ color: lineColor, label: label ?? '', value: hover.value }]} />
      )}
    </div>
  )
}
