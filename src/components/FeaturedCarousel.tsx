import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiPricePoint } from '../lib/api'
import { FullChart, MultiLineChart } from './SparkChart'
import { displayPair } from '../lib/prices'
import type { Market, PricePoint } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { formatVolume, daysLeft } from '../lib/format'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { Badge } from './Badge'
import { Icon } from './Icon'

interface FeaturedCarouselProps {
  markets: Market[]
}

// Hero de la Home: [thumb + pregunta + probabilidad + meta | gráfica].
// Recibe Market[] (ya mapeado: imageUrl y labels limpios).
export function FeaturedCarousel({ markets }: FeaturedCarouselProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const featured = useMemo(() => {
    return markets
      .filter(m => m.status === 'open')
      .sort((a, b) => {
        if (a.trending !== b.trending) return a.trending ? -1 : 1
        return b.volume - a.volume
      })
      .slice(0, 5)
  }, [markets])

  const [active, setActive] = useState(0)
  // Historial CRUDO por mercado (con outcome_key para multi) — se deriva por variante abajo.
  const [historyCache, setHistoryCache] = useState<Record<string, ApiPricePoint[]>>({})
  const [chartW, setChartW] = useState(0)

  useEffect(() => {
    if (active >= featured.length) setActive(0)
  }, [featured.length, active])

  const current = featured[active]

  useEffect(() => {
    if (!current || historyCache[current.id]) return
    let cancelled = false
    marketsApi.history(current.id, 30)
      .then((hist: ApiPricePoint[]) => {
        if (cancelled) return
        setHistoryCache(prev => ({ ...prev, [current.id]: hist }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [current, historyCache])

  // Mide el ancho real de la columna del chart (viewBox fijo). Callback ref
  // porque el grid interior se remonta por key={active}.
  const roRef = useRef<ResizeObserver | null>(null)
  const chartColRef = useCallback((node: HTMLDivElement | null) => {
    roRef.current?.disconnect()
    roRef.current = null
    if (node) {
      const ro = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width
        if (w) setChartW(Math.round(w))
      })
      ro.observe(node)
      roRef.current = ro
    }
  }, [])

  const m = current
  const isMulti = m?.marketType === 'multi'
  const rawHist = m ? historyCache[m.id] : undefined

  const chartData = useMemo<PricePoint[]>(() => {
    if (!rawHist || isMulti) return []
    return rawHist.map(p => ({ date: p.recorded_at.slice(0, 10), price: p.yes_price }))
  }, [rawHist, isMulti])

  const multiOutcomes = useMemo(
    () => (m && isMulti ? [...(m.outcomes ?? [])].sort((a, b) => b.price - a.price) : []),
    [m, isMulti],
  )

  const multiSeries = useMemo(() => {
    if (!m || !isMulti) return []
    const grouped: Record<string, PricePoint[]> = {}
    for (const pt of rawHist ?? []) {
      if (!pt.outcome_key) continue
      if (!grouped[pt.outcome_key]) grouped[pt.outcome_key] = []
      grouped[pt.outcome_key].push({ date: pt.recorded_at, price: pt.yes_price })
    }
    const now = new Date().toISOString()
    return multiOutcomes.slice(0, 4).map(o => ({
      outcome_key: o.outcome_key,
      label: o.label,
      data: grouped[o.outcome_key]?.length ? grouped[o.outcome_key] : [{ date: now, price: o.price }],
    }))
  }, [m, isMulti, rawHist, multiOutcomes])

  if (featured.length === 0 || !m) return null

  const yesPrice = m.yesPrice
  const pair = displayPair(yesPrice)
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--text-primary)'

  const historyLoading = !rawHist
  const narrowCol = chartW > 0 && chartW < 520
  const chartH = isMulti ? (narrowCol ? 180 : 260) : (narrowCol ? 200 : 300)

  const go = (dir: number) => setActive(i => (i + dir + featured.length) % featured.length)

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="card featured-slide"
        style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
        onClick={e => {
          if ((e.target as HTMLElement).closest('a,button')) return
          navigate(`/mercado/${m.id}`)
        }}
      >
        <div key={active} className="featured-slide-grid fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) minmax(0, 1fr)', minHeight: 380 }}>

          {/* ── Izquierda: info ── */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <Badge tone="category" color={getCategoryColor(m.category)} bg={getCategoryBg(m.category)}>
                {m.subcategory ?? m.category}
              </Badge>
              {m.trending && !isMulti && <Badge icon="trending">{t('common.trendingBadge')}</Badge>}
              {featured.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                  <button onClick={() => go(-1)} aria-label={t('carousel.prevMarket')} className="carousel-nav-btn">
                    <Icon name="chevron-left" size={16} strokeWidth={2} />
                  </button>
                  <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', minWidth: 30, textAlign: 'center' }}>
                    {active + 1}/{featured.length}
                  </span>
                  <button onClick={() => go(1)} aria-label={t('carousel.nextMarket')} className="carousel-nav-btn">
                    <Icon name="chevron-right" size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <MarketThumb market={m} size={56} />
              <Link to={`/mercado/${m.id}`} style={{ textDecoration: 'none', minWidth: 0 }}>
                <h2 className={`featured-title${isMulti ? ' featured-title-multi' : ''}`} style={{
                  fontSize: 'clamp(1.15rem, 1.5vw, 1.4rem)', fontWeight: 600, letterSpacing: '-0.015em',
                  margin: 0, lineHeight: 1.25, color: 'var(--text-primary)',
                }}>
                  {m.question}
                </h2>
              </Link>
            </div>

            {isMulti ? (
              <div className="featured-outcomes" style={{ marginBottom: 12 }}>
                {multiOutcomes.slice(0, 4).map((o, i) => (
                  <div key={o.outcome_key} className="featured-outcome-row" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--chart-${i + 1})`, flexShrink: 0 }} />
                    <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={m.subcategory} marketId={m.id} size={20} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {o.label}
                    </span>
                    <span className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {Math.round(o.price)}%
                    </span>
                  </div>
                ))}
                {multiOutcomes.length > 4 && (
                  <div className="meta-label" style={{ paddingTop: 8 }}>
                    {t('carousel.moreOutcomes', { count: multiOutcomes.length - 4 })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                  <span className="num" style={{ fontSize: 'clamp(2rem, 2.6vw, 2.6rem)', fontWeight: 700, color: yesColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {pair.yes}%
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{t('carousel.chance', { defaultValue: 'probabilidad' })}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <Link to={`/mercado/${m.id}?side=YES`} className="btn btn-yes" style={{ flex: 1, height: 40, padding: 0, justifyContent: 'center', textDecoration: 'none' }}>
                    {t('common.yes')} <span className="num">{pair.yes}%</span>
                  </Link>
                  <Link to={`/mercado/${m.id}?side=NO`} className="btn btn-no" style={{ flex: 1, height: 40, padding: 0, justifyContent: 'center', textDecoration: 'none' }}>
                    {t('common.no')} <span className="num">{pair.no}%</span>
                  </Link>
                </div>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 10 }}>
              <div>
                <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {formatVolume(m.volume)} <span className="meta-label">PT</span>
                </div>
                <div className="meta-label">{t('carousel.volumeLabel')}</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {daysLeft(m.endsAt, m.status)}
                </div>
                <div className="meta-label">{t('carousel.closeLabel')}</div>
              </div>
              <Link to={`/mercado/${m.id}`} style={{ marginLeft: 'auto', textDecoration: 'none', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('carousel.viewFull')}
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>

          {/* ── Derecha: gráfica ── */}
          <div ref={chartColRef} className="featured-slide-chart" style={{ padding: '20px 24px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {historyLoading ? (
              <div className="skeleton" style={{ height: chartH, borderRadius: 10, background: 'var(--bg-surface)', border: 'none' }} />
            ) : isMulti ? (
              <MultiLineChart series={multiSeries} height={chartH} viewW={chartW || 700} interactive={false} />
            ) : chartData.length > 1 ? (
              <FullChart data={chartData} height={chartH} viewW={chartW || 700} interactive={false} />
            ) : (
              <div className="meta-label" style={{ height: chartH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('common.noHistory')}
              </div>
            )}
          </div>
        </div>
      </div>

      {featured.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={t('carousel.slideAria', { num: i + 1 })}
              style={{
                width: i === active ? 18 : 6, height: 6, borderRadius: 3,
                border: 'none', cursor: 'pointer', padding: 0,
                background: i === active ? 'var(--text-primary)' : 'var(--border-default)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
