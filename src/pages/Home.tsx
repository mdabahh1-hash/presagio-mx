import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import type { Category, Market } from '../types'
import { Logo } from '../components/Logo'

const CATEGORIES: Category[] = ['Política MX', 'Economía', 'Deportes', 'Global', 'Tech']
const CATEGORY_ICONS: Record<string, string> = {
  'Política MX': '🏛',
  'Economía': '📈',
  'Deportes': '⚽',
  'Global': '🌎',
  'Tech': '💻',
}

const STATIC_STATS = [
  { label: 'Volumen total', value: '12.4M', unit: 'PT' },
  { label: 'Usuarios activos', value: '9,200', unit: '' },
  { label: 'Precisión promedio', value: '71', unit: '%' },
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
      <section style={{ padding: '64px 0 48px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(201, 72, 40, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div className="live-dot" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Mercados de predicción en tiempo real
          </span>
        </div>

        <h1 className="font-display anim-2" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 20 }}>
          Apuesta con
          <br />
          <span className="text-gradient">conocimiento.</span>
        </h1>

        <p className="anim-3" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          El mercado de predicciones líder en México. Pronostica eventos políticos, económicos y deportivos con puntos virtuales.
        </p>

        <form onSubmit={handleSearch} className="anim-4" style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: '100%', maxWidth: 520, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
            <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 16, color: 'var(--text-tertiary)', fontSize: '1rem', flexShrink: 0 }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Busca un mercado... ej. 'dólar', 'elecciones'"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}
            />
            <button type="submit" style={{ background: 'var(--brand)', border: 'none', padding: '14px 20px', color: '#fff', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0 }}>
              BUSCAR
            </button>
          </div>
        </form>

        <div className="anim-5" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <Link key={cat} to={`/mercados?cat=${encodeURIComponent(cat)}`} style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px', cursor: 'pointer' }}>
                {CATEGORY_ICONS[cat]} {cat}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="anim-5" style={{ marginBottom: 56 }}>
        <div className="home-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border-subtle)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {/* First cell: live market count from API */}
          <div style={{ background: 'var(--bg-card)', padding: '20px 24px', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
              {loading ? '—' : markets.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>Mercados abiertos</div>
          </div>
          {STATIC_STATS.map((stat, i) => (
            <div key={stat.label} style={{ background: 'var(--bg-card)', padding: '20px 24px', textAlign: 'center' }}>
              <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: i === 0 ? 'var(--green)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {stat.value}{stat.unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 4 }}>{stat.unit}</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured market */}
      {featured && (
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>✦ Mercado destacado</h2>
          </div>
          <Link to={`/mercado/${featured.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '28px 32px', background: 'linear-gradient(135deg, rgba(201, 72, 40, 0.08), var(--bg-card))', borderColor: 'rgba(201, 72, 40, 0.3)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', background: 'var(--brand-dim)', border: '1px solid rgba(201,72,40,0.3)', padding: '3px 10px', borderRadius: 99 }}>
                  {featured.category}
                </span>
              </div>
              <h3 className="font-display" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.3 }}>
                {featured.question}
              </h3>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--green)', lineHeight: 1 }}>{featured.yesPrice}%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>probabilidad SÍ</div>
                </div>
                <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', lineHeight: 1 }}>{(featured.volume / 1000).toFixed(0)}K</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>PT volumen</div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Trending */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>↑ Tendencias</h2>
          <Link to="/mercados" style={{ textDecoration: 'none', fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600 }}>Ver todos →</Link>
        </div>
        {loading ? (
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, height: 200, animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        ) : (
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {(trending.length > 0 ? trending : markets).slice(0, 6).map((market, i) => (
              <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section style={{ marginBottom: 64, textAlign: 'center', padding: '48px 32px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,72,40,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Logo size={40} />
        <h2 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '16px 0 12px' }}>Empieza a predecir hoy</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          Recibes <span style={{ color: 'var(--gold)', fontWeight: 700 }}>1,000 PT</span> de bienvenida para empezar a operar.
        </p>
        <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
          <button style={{ background: 'linear-gradient(135deg, var(--brand), #a03020)', border: 'none', padding: '14px 32px', color: '#fff', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.08em', borderRadius: 10, cursor: 'pointer' }}>
            REGISTRARSE CON GOOGLE
          </button>
        </a>
      </section>
    </div>
  )
}
