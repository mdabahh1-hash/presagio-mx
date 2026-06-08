import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import type { Category, Market } from '../types'

const CATEGORIES: Category[] = ['Política MX', 'Economía', 'Deportes', 'Global', 'Tech']
const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#e0522e',
  'Economía': '#ffd060',
  'Deportes': '#00e87d',
  'Global': '#4f8eff',
  'Tech': '#a060ff',
}

const STATIC_STATS = [
  { label: 'Volumen total', value: '12.4M', unit: 'PT', color: 'var(--green)' },
  { label: 'Usuarios activos', value: '9,200', unit: '', color: 'var(--text-primary)' },
  { label: 'Precisión promedio', value: '71', unit: '%', color: 'var(--blue)' },
]

function apiToMarket(m: ApiMarket): Market {
  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category as Category,
    yesPrice: Math.round(m.yes_price),
    volume: m.volume,
    liquidity: m.volume * 0.1,
    endsAt: m.ends_at,
    resolutionCriteria: '',
    trending: m.trending,
    history: [],
    comments: [],
  }
}

export function Home() {
  const [search, setSearch] = useState('')
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    marketsApi.list()
      .then(data => setMarkets(data.map(apiToMarket)))
      .catch(() => setMarkets(MOCK_MARKETS))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/mercados?q=${encodeURIComponent(search)}`)
  }

  const trending = markets.filter(m => m.trending)
  const featured = markets[0] ?? MOCK_MARKETS[0]

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

      {/* Hero */}
      <section style={{ padding: '72px 0 56px', textAlign: 'center', position: 'relative' }}>
        {/* Radial glow bg */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -60%)',
          width: 700, height: 400,
          background: 'radial-gradient(ellipse, rgba(79, 142, 255, 0.1) 0%, rgba(224, 82, 46, 0.07) 50%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Live badge */}
        <div className="anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0, 232, 125, 0.08)',
            border: '1px solid rgba(0, 232, 125, 0.2)',
            borderRadius: 99, padding: '6px 14px',
          }}>
            <div className="live-dot" />
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--green)',
            }}>
              Mercados en tiempo real
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display anim-2" style={{
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          fontWeight: 800, letterSpacing: '-0.04em',
          lineHeight: 1.0, marginBottom: 24,
        }}>
          Predice.
          <br />
          <span className="text-gradient">Gana.</span>
        </h1>

        <p className="anim-3" style={{
          fontSize: '1.05rem', color: 'var(--text-secondary)',
          maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.65,
        }}>
          El mercado de predicciones de México. Apuesta en eventos políticos, económicos y deportivos con puntos virtuales.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="anim-4" style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'flex', width: '100%', maxWidth: 540,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', paddingLeft: 18,
              color: 'var(--text-tertiary)', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Busca un mercado... ej. 'dólar', 'elecciones'"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                padding: '16px 16px', fontSize: '0.9rem',
                color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans',
              }}
            />
            <button type="submit" style={{
              background: 'var(--brand)', border: 'none',
              padding: '16px 22px', color: '#fff',
              fontFamily: 'Syne', fontWeight: 700,
              fontSize: '0.78rem', letterSpacing: '0.08em',
              cursor: 'pointer', flexShrink: 0,
              transition: 'opacity 0.15s',
            }}>
              BUSCAR
            </button>
          </div>
        </form>

        {/* Category pills */}
        <div className="anim-5" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const color = CATEGORY_COLORS[cat] || 'var(--text-secondary)'
            return (
              <Link key={cat} to={`/mercados?cat=${encodeURIComponent(cat)}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.78rem', fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 99, padding: '7px 14px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {cat}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Stats bar */}
      <section className="anim-5" style={{ marginBottom: 64 }}>
        <div className="home-stats-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: 'var(--border-subtle)',
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}>
          {/* Live market count */}
          <div style={{ background: 'var(--bg-card)', padding: '24px 28px', textAlign: 'center', position: 'relative' }}>
            <div className="font-mono" style={{
              fontSize: '2.4rem', fontWeight: 800,
              color: 'var(--gold)', letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {loading ? '—' : markets.filter(m => (m as any).status !== 'closed' && (m as any).status !== 'resolved_yes' && (m as any).status !== 'resolved_no').length || markets.length}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 500, letterSpacing: '0.04em' }}>
              Mercados abiertos
            </div>
          </div>
          {STATIC_STATS.map((stat) => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '24px 28px', textAlign: 'center' }}>
              <div className="font-mono" style={{
                fontSize: '2.4rem', fontWeight: 800,
                color: stat.color, letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                {stat.value}
                {stat.unit && (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginLeft: 4, fontWeight: 600 }}>
                    {stat.unit}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 500, letterSpacing: '0.04em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured market */}
      {featured && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="exchange-header">Mercado destacado</div>
          </div>
          <Link to={`/mercado/${featured.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              padding: '32px 36px',
              background: 'linear-gradient(135deg, rgba(224, 82, 46, 0.07) 0%, var(--bg-card) 60%)',
              borderColor: 'rgba(224, 82, 46, 0.25)',
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--brand)',
                  background: 'rgba(224, 82, 46, 0.12)',
                  border: '1px solid rgba(224, 82, 46, 0.3)',
                  padding: '3px 10px', borderRadius: 99,
                }}>
                  {featured.category}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 className="font-display" style={{
                    fontSize: 'clamp(1.2rem, 3vw, 1.9rem)',
                    fontWeight: 700, letterSpacing: '-0.02em',
                    margin: '0 0 8px', lineHeight: 1.25,
                    color: 'var(--text-primary)',
                  }}>
                    {featured.question}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{
                      fontSize: '3.5rem', fontWeight: 800,
                      fontFamily: 'JetBrains Mono',
                      color: featured.yesPrice > 50 ? 'var(--green)' : featured.yesPrice < 35 ? 'var(--red)' : 'var(--gold)',
                      lineHeight: 1, letterSpacing: '-0.04em',
                    }}>
                      {featured.yesPrice}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600, letterSpacing: '0.06em' }}>
                      PROBABILIDAD SÍ
                    </div>
                  </div>
                  <div style={{ width: 1, height: 56, background: 'var(--border-subtle)' }} />
                  <div>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 700,
                      fontFamily: 'JetBrains Mono',
                      color: 'var(--text-primary)', lineHeight: 1,
                    }}>
                      {(featured.volume / 1000).toFixed(0)}K
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600, letterSpacing: '0.06em' }}>
                      PT VOLUMEN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Trending markets */}
      <section style={{ marginBottom: 72 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="exchange-header">Mercados activos</div>
          <Link to="/mercados" style={{
            textDecoration: 'none', fontSize: '0.8rem',
            color: 'var(--blue)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Ver todos
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
        {loading ? (
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14, height: 210,
                animation: 'livePulse 1.8s ease infinite',
              }} />
            ))}
          </div>
        ) : (
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {(trending.length > 0 ? trending : markets).slice(0, 6).map((market, i) => (
              <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section style={{
        marginBottom: 72, textAlign: 'center',
        padding: '56px 32px',
        background: 'var(--bg-card)',
        borderRadius: 20, border: '1px solid var(--border-subtle)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 50%, rgba(79, 142, 255, 0.07) 0%, rgba(224, 82, 46, 0.05) 50%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255, 208, 96, 0.1)',
            border: '1px solid rgba(255, 208, 96, 0.25)',
            borderRadius: 99, padding: '6px 16px', marginBottom: 24,
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em' }}>
              BIENVENIDA: 1,000 PT GRATIS
            </span>
          </div>
          <h2 className="font-display" style={{
            fontSize: '2.2rem', fontWeight: 800,
            letterSpacing: '-0.03em', margin: '0 0 14px',
          }}>
            Empieza a predecir hoy
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
            Regístrate gratis y recibe <span style={{ color: 'var(--gold)', fontWeight: 700 }}>1,000 PT</span> para comenzar a operar en los mercados.
          </p>
          <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(135deg, var(--brand), #b03018)',
              border: 'none', padding: '16px 40px',
              color: '#fff', fontFamily: 'Syne', fontWeight: 800,
              fontSize: '0.9rem', letterSpacing: '0.08em',
              borderRadius: 12, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(224, 82, 46, 0.3)',
              transition: 'all 0.2s',
            }}>
              REGISTRARSE CON GOOGLE →
            </button>
          </a>
        </div>
      </section>
    </div>
  )
}
