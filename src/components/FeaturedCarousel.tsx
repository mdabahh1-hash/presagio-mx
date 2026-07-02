import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { marketsApi, type ApiMarket, type ApiPricePoint } from '../lib/api'
import { FullChart } from './SparkChart'
import { BetBox } from './BetBox'
import type { PricePoint } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#FFD700', 'Economía': '#FFD700', 'Deportes': '#00FF88',
  'Global': '#a0c4ff', 'Tech': '#a060ff', 'Mundial 2026': '#00FF88', 'Crypto': '#f7931a',
  'Clima': '#38bdf8', 'Boxeo': '#ff4d6d', 'Motor': '#ff7849',
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(0)
}

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Cerrado'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

interface FeaturedCarouselProps {
  markets: ApiMarket[]
  onRequireAuth: () => void
}

export function FeaturedCarousel({ markets, onRequireAuth }: FeaturedCarouselProps) {
  const featured = useMemo(() => {
    return markets
      // Binary only — the carousel's YES/NO BetBox + "SÍ x%" headline don't fit multi markets.
      .filter(m => m.status === 'open' && m.market_type !== 'multi')
      .sort((a, b) => {
        if (a.trending !== b.trending) return a.trending ? -1 : 1
        return b.volume - a.volume
      })
      .slice(0, 5)
  }, [markets])

  const [active, setActive] = useState(0)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [historyCache, setHistoryCache] = useState<Record<string, PricePoint[]>>({})

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
        setHistoryCache(prev => ({
          ...prev,
          [current.id]: hist.map(p => ({ date: p.recorded_at.slice(0, 10), price: p.yes_price })),
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [current, historyCache])

  if (featured.length === 0 || !current) return null

  const m = current
  const yesPrice = priceOverrides[m.id] ?? Math.round(m.yes_price)
  const noPrice = Math.round(100 - yesPrice)
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--gold)'
  const catColor = CATEGORY_COLORS[m.category] || '#a0c4ff'
  const chartData = historyCache[m.id] ?? []

  const go = (dir: number) => setActive(i => (i + dir + featured.length) % featured.length)

  return (
    <div style={{ position: 'relative' }}>
      <div key={active} className="anim-1 card featured-slide" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="featured-slide-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px' }}>

          {/* ── Left: market info ── */}
          <div style={{ padding: '26px 30px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: catColor,
                background: `${catColor}15`, border: `1px solid ${catColor}35`,
                padding: '3px 10px', borderRadius: 99,
              }}>
                {m.category}
              </span>
              {m.trending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'rgba(255, 208, 96, 0.1)',
                  border: '1px solid rgba(255, 208, 96, 0.25)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  ▲ TENDENCIA
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.62rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em' }}>EN VIVO</span>
                </div>
                {featured.length > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 99, padding: '3px 4px',
                  }}>
                    <button onClick={() => go(-1)} aria-label="Mercado anterior" className="carousel-nav-btn">
                      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                        <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="font-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 30, textAlign: 'center' }}>
                      {active + 1}/{featured.length}
                    </span>
                    <button onClick={() => go(1)} aria-label="Mercado siguiente" className="carousel-nav-btn">
                      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                        <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Link to={`/mercado/${m.id}`} style={{ textDecoration: 'none' }}>
              <h2 className="font-display" style={{
                fontSize: 'clamp(1.25rem, 2.6vw, 1.85rem)',
                fontWeight: 700, letterSpacing: '-0.025em',
                margin: '0 0 18px', lineHeight: 1.22,
                color: 'var(--text-primary)',
              }}>
                {m.question}
              </h2>
            </Link>

            {/* Big probability */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
              <div>
                <span style={{
                  fontSize: 'clamp(2.6rem, 5vw, 3.8rem)',
                  fontWeight: 800, fontFamily: 'DM Mono',
                  color: yesColor, lineHeight: 1, letterSpacing: '-0.04em',
                }}>
                  {yesPrice}%
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: 10, fontWeight: 600 }}>SÍ</span>
              </div>
              <div style={{ paddingBottom: 6, opacity: 0.5 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                  {noPrice}%
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginLeft: 6, fontWeight: 600 }}>NO</span>
              </div>
            </div>

            {/* Dual probability bar */}
            <div style={{ marginBottom: 18 }}>
              <div className="prob-bar-dual">
                <div style={{
                  width: `${yesPrice}%`,
                  background: 'linear-gradient(90deg, var(--green), rgba(0, 232, 125, 0.55))',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
                <div style={{
                  flex: 1,
                  background: 'linear-gradient(90deg, rgba(255, 45, 85, 0.4), var(--red))',
                }} />
              </div>
            </div>

            {/* Mini chart */}
            <div style={{ marginBottom: 16 }}>
              {chartData.length > 1 ? (
                <FullChart data={chartData} height={120} />
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  Sin suficientes datos de historial aún
                </div>
              )}
            </div>

            {/* Meta + link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {formatVolume(m.volume)}<span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: 3 }}>PT</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 600, letterSpacing: '0.04em' }}>VOLUMEN</div>
              </div>
              <div>
                <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
                  {daysLeft(m.ends_at)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 600, letterSpacing: '0.04em' }}>CIERRE</div>
              </div>
              <Link to={`/mercado/${m.id}`} style={{
                marginLeft: 'auto', textDecoration: 'none', fontSize: '0.8rem',
                color: 'var(--blue)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Ver mercado completo
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Right: bet box ── */}
          <div className="featured-slide-bet" style={{
            padding: '24px 22px',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}>
            <BetBox
              key={m.id}
              marketId={m.id}
              yesPrice={yesPrice}
              compact
              onRequireAuth={onRequireAuth}
              onTraded={(p) => setPriceOverrides(prev => ({ ...prev, [m.id]: Math.round(p) }))}
            />
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
              aria-label={`Mercado ${i + 1}`}
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
