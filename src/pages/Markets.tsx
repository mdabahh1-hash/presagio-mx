import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { CategoryBrowse } from '../components/CategoryBrowse'
import type { Category, Market } from '../types'

const ALL_CATEGORIES: (Category | 'Todos')[] = [
  'Todos', 'Mundial 2026', 'Economía', 'Crypto', 'Mercados Globales',
  'Política MX', 'Deportes', 'Boxeo', 'Motor', 'México', 'Global', 'Tech', 'Clima', 'Entretenimiento',
]
const SORT_OPTIONS = [
  { value: 'volume', label: 'Mayor volumen' },
  { value: 'trending', label: 'Tendencias' },
  { value: 'ending', label: 'Cierra pronto' },
]
const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#FFD700', 'Economía': '#FFD700', 'Deportes': '#00FF88',
  'Global': '#a0c4ff', 'Tech': '#a060ff',
  'Mundial 2026': '#00FF88', 'Crypto': '#f7931a',
  'Mercados Globales': '#a0c4ff', 'México': '#FFD700',
  'Clima': '#38bdf8', 'Boxeo': '#ff4d6d', 'Motor': '#ff7849',
}

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
    marketType: m.market_type ?? 'binary',
    outcomes: m.outcomes ?? [],
    resolvedOutcomeKey: m.resolved_outcome_key,
    history: [],
    comments: [],
  }
}

export function Markets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState('volume')
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  const queryParam = searchParams.get('q') || ''
  const catParam = (searchParams.get('cat') || 'Todos') as Category | 'Todos'
  const [searchInput, setSearchInput] = useState(queryParam)
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(catParam)

  useEffect(() => {
    setSearchInput(queryParam)
    setActiveCategory(catParam)
  }, [queryParam, catParam])

  useEffect(() => {
    let active = true
    setLoading(true)
    marketsApi.list({
      category: activeCategory !== 'Todos' ? activeCategory : undefined,
      q: searchInput || undefined,
      sort: sortBy,
      limit: 100,
    })
      .then(data => { if (active) setMarkets(data.map(apiToMarket)) })
      .catch(() => { if (active) setMarkets(MOCK_MARKETS.map(m => ({ ...m, yesPrice: m.yesPrice }))) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }  // drop out-of-order responses from fast typing / tab switches
  }, [activeCategory, searchInput, sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams(p => {
      if (searchInput) p.set('q', searchInput)
      else p.delete('q')
      return p
    })
  }

  const handleCategoryClick = (cat: Category | 'Todos') => {
    setActiveCategory(cat)
    setSearchParams(p => {
      if (cat === 'Todos') p.delete('cat')
      else p.set('cat', cat)
      return p
    })
  }

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px' }}>

      {/* Page header */}
      <div className="anim-1" style={{ marginBottom: 36 }}>
        <h1 className="font-display" style={{
          fontSize: '2.2rem', fontWeight: 800,
          letterSpacing: '-0.04em', margin: '0 0 8px',
        }}>
          Mercados
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
          {loading ? (
            <span style={{ color: 'var(--text-tertiary)' }}>Cargando...</span>
          ) : (
            <>
              <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: 'DM Mono' }}>{markets.length}</span>
              {' '}mercados activos · Actualizado en tiempo real
            </>
          )}
        </p>
      </div>

      {/* Search + Controls */}
      <div className="anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
        {/* Search bar */}
        <form onSubmit={handleSearch}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 12, overflow: 'hidden',
            maxWidth: 560,
            transition: 'border-color 0.15s',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center',
              paddingLeft: 16, color: 'var(--text-tertiary)',
            }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar mercados..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', padding: '13px 14px',
                fontSize: '0.875rem', color: 'var(--text-primary)',
                fontFamily: 'DM Sans',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchParams(p => { p.delete('q'); return p }) }}
                style={{
                  background: 'transparent', border: 'none',
                  padding: '0 14px', color: 'var(--text-tertiary)',
                  cursor: 'pointer', fontSize: '1.1rem',
                }}
              >×</button>
            )}
          </div>
        </form>

        {/* Category pills + sort */}
        <div className="markets-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_CATEGORIES.map(cat => {
              const isActive = cat === activeCategory
              const color = cat === 'Todos' ? 'var(--blue)' : CATEGORY_COLORS[cat] || 'var(--text-secondary)'
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  style={{
                    background: isActive
                      ? cat === 'Todos' ? 'rgba(255, 215, 0, 0.12)' : `${color}15`
                      : 'transparent',
                    border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
                    borderRadius: 99, padding: '7px 14px',
                    fontSize: '0.78rem', fontWeight: 600,
                    color: isActive ? color : 'var(--text-tertiary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'DM Sans',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
          {activeCategory === 'Todos' && (
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 10, padding: '9px 14px',
                fontSize: '0.8rem', color: 'var(--text-secondary)',
                outline: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans',
              }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {activeCategory !== 'Todos' ? (
        /* Category view — same sidebar layout as the home page */
        <CategoryBrowse category={activeCategory} markets={markets} loading={loading} />
      ) : (
        <>
          {/* Results count */}
          {!loading && (
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99, padding: '3px 10px',
                fontFamily: 'DM Mono',
              }}>
                {markets.length} resultado{markets.length !== 1 ? 's' : ''}
              </span>
              {searchInput && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  · búsqueda: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>"{searchInput}"</span>
                </span>
              )}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14, height: 210,
                }} />
              ))}
            </div>
          ) : markets.length > 0 ? (
            <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {markets.map((market, i) => (
                <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '1.5rem',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                No encontramos mercados
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                Intenta con otra categoría o búsqueda
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
