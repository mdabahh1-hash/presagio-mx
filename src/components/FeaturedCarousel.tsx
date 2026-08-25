import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket, type ApiPricePoint } from '../lib/api'
import { FullChart, MultiLineChart } from './SparkChart'
import { displayPair } from '../lib/prices'
import type { PricePoint } from '../types'
import { getCategoryColor, getCategoryBg, getCategoryBorder } from '../lib/categoryColors'
import { formatVolume, daysLeft } from '../lib/format'

interface FeaturedCarouselProps {
  markets: ApiMarket[]
}

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

  // Keep active index valid if the featured set changes
  useEffect(() => {
    if (active >= featured.length) setActive(0)
  }, [featured.length, active])

  const current = featured[active]

  // Lazily fetch history for the active slide
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

  // Mide el ancho real de la columna del chart: el viewBox del SVG usa ancho
  // fijo con preserveAspectRatio, así que sin esto la altura renderizada
  // dependería del ancho. Callback ref porque el card se remonta por key={active}.
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
  const isMulti = m?.market_type === 'multi'
  const rawHist = m ? historyCache[m.id] : undefined

  const chartData = useMemo<PricePoint[]>(() => {
    if (!rawHist || isMulti) return []
    return rawHist.map(p => ({ date: p.recorded_at.slice(0, 10), price: p.yes_price }))
  }, [rawHist, isMulti])

  const multiOutcomes = useMemo(
    () => (m && isMulti ? [...(m.outcomes ?? [])].sort((a, b) => b.price - a.price) : []),
    [m, isMulti],
  )

  // Series para el MultiLineChart — mismo orden que la lista (colores coinciden).
  // Sin puntos con outcome_key → 1 punto por outcome al precio actual (línea plana).
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

  const yesPrice = m.yes_price
  const pair = displayPair(yesPrice)  // NO derived from rounded YES: sums to 100
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--gold)'
  const catColor = getCategoryColor(m.category)

  const historyLoading = !rawHist
  const narrowCol = chartW > 0 && chartW < 520
  const chartH = isMulti ? (narrowCol ? 180 : 260) : (narrowCol ? 200 : 300)

  const go = (dir: number) => setActive(i => (i + dir + featured.length) % featured.length)

  return (
    <div style={{ position: 'relative' }}>
      <div
        key={active}
        className="anim-1 card featured-slide"
        style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
        onClick={e => {
          // Toda la tarjeta navega, salvo clicks en controles anidados (flechas/links)
          if ((e.target as HTMLElement).closest('a,button')) return
          navigate(`/mercado/${m.id}`)
        }}
      >
        <div className="featured-slide-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) minmax(0, 1fr)', minHeight: 380 }}>

          {/* ── Left: market info ── */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: catColor,
                background: getCategoryBg(m.category), border: `1px solid ${getCategoryBorder(m.category)}`,
                padding: '3px 10px', borderRadius: 99,
              }}>
                {m.category}
              </span>
              {/* En multi se omite TENDENCIA: junto a categoría+MULTI la fila
                  envolvería a 2 líneas y el contenido ya no cabe en los 420px */}
              {m.trending && !isMulti && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'var(--oro-dim)',
                  border: '1px solid var(--oro-glow)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  {t('common.trendingBadge')}
                </span>
              )}
              {isMulti && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--accent-alt)',
                  background: 'var(--accent-alt-bg)',
                  border: '1px solid var(--accent-alt-border)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  {t('common.multiBadge')}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.62rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em' }}>{t('common.live')}</span>
                </div>
                {featured.length > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 99, padding: '3px 4px',
                  }}>
                    <button onClick={() => go(-1)} aria-label={t('carousel.prevMarket')} className="carousel-nav-btn">
                      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                        <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 30, textAlign: 'center' }}>
                      {active + 1}/{featured.length}
                    </span>
                    <button onClick={() => go(1)} aria-label={t('carousel.nextMarket')} className="carousel-nav-btn">
                      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                        <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Link to={`/mercado/${m.id}`} style={{ textDecoration: 'none' }}>
              <h2 className={`font-display featured-title${isMulti ? ' featured-title-multi' : ''}`} style={{
                fontSize: 'clamp(1.25rem, 1.6vw, 1.6rem)',
                fontWeight: 700, letterSpacing: '-0.025em',
                margin: '0 0 14px', lineHeight: 1.25,
                color: 'var(--text-primary)',
              }}>
                {m.question}
              </h2>
            </Link>

            {isMulti ? (
              /* Top outcomes — orden y colores idénticos a las series del chart */
              <div className="featured-outcomes" style={{ marginBottom: 12 }}>
                {multiOutcomes.slice(0, 4).map((o, i) => (
                  <div key={o.outcome_key} className="featured-outcome-row" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: `var(--chart-${i + 1})`, flexShrink: 0 }} />
                    <span style={{
                      fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                    }}>
                      {o.label}
                    </span>
                    <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {Math.round(o.price)}%
                    </span>
                  </div>
                ))}
                {multiOutcomes.length > 4 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingTop: 8, fontWeight: 600 }}>
                    {t('carousel.moreOutcomes', { count: multiOutcomes.length - 4 })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Big probability */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
                  <div>
                    <span style={{
                      fontSize: 'clamp(2.4rem, 3vw, 3.2rem)',
                      fontWeight: 800, fontFamily: 'DM Mono',
                      color: yesColor, lineHeight: 1, letterSpacing: '-0.04em',
                    }}>
                      {pair.yes}%
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: 10, fontWeight: 600 }}>{t('common.yes')}</span>
                  </div>
                  <div style={{ paddingBottom: 5, opacity: 0.5 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                      {pair.no}%
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginLeft: 6, fontWeight: 600 }}>{t('common.no')}</span>
                  </div>
                </div>

                {/* Dual probability bar */}
                <div style={{ marginBottom: 12 }}>
                  <div className="prob-bar-dual">
                    <div style={{
                      width: `${yesPrice}%`,
                      background: 'linear-gradient(90deg, var(--green), var(--green-grad-2))',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(90deg, var(--red-grad-2), var(--red))',
                    }} />
                  </div>
                </div>
              </>
            )}

            {/* Meta + link (pegado abajo) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 12 }}>
              <div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {formatVolume(m.volume)}<span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: 3 }}>PT</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 600, letterSpacing: '0.04em' }}>{t('carousel.volumeLabel')}</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
                  {daysLeft(m.ends_at, m.status)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 600, letterSpacing: '0.04em' }}>{t('carousel.closeLabel')}</div>
              </div>
              <Link to={`/mercado/${m.id}`} style={{
                marginLeft: 'auto', textDecoration: 'none', fontSize: '0.8rem',
                color: 'var(--blue)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {t('carousel.viewFull')}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Right: big chart ── */}
          <div ref={chartColRef} className="featured-slide-chart" style={{
            padding: '20px 24px 14px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {historyLoading ? (
              <div style={{ height: chartH, borderRadius: 10, background: 'var(--bg-surface)', animation: 'livePulse 1.8s ease infinite' }} />
            ) : isMulti ? (
              <MultiLineChart series={multiSeries} height={chartH} viewW={chartW || 700} />
            ) : chartData.length > 1 ? (
              <FullChart data={chartData} height={chartH} viewW={chartW || 700} />
            ) : (
              <div style={{ height: chartH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                {t('common.noHistory')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dots */}
      {featured.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={t('carousel.slideAria', { num: i + 1 })}
              style={{
                width: i === active ? 22 : 8, height: 8, borderRadius: 99,
                border: 'none', cursor: 'pointer', padding: 0,
                background: i === active ? 'var(--gold)' : 'var(--border-default)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
