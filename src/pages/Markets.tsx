import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import type { Category, Market } from '../types'

const ALL_CATEGORIES: (Category | 'Todos')[] = ['Todos', 'Política MX', 'Economía', 'Deportes', 'Global', 'Tech']
const SORT_OPTIONS = [
  { value: 'volume', label: 'Mayor volumen' },
  { value: 'trending', label: 'Tendencias' },
  { value: 'ending', label: 'Cierra pronto' },
]
const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#c94828', 'Economía': '#f0c040', 'Deportes': '#00d084', 'Global': '#6888ff', 'Tech': '#a060ff',
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
    setLoading(true)
    marketsApi.list({
      category: activeCategory !== 'Todos' ? activeCategory : undefined,
      q: searchInput || undefined,
      sort: sortBy,
    })
      .then(data => setMarkets(data.map(apiToMarket)))
      .catch(() => setMarkets(MOCK_MARKETS.map(m => ({ ...m, yesPrice: m.yesPrice }))))
      .finally(() => setLoading(false))
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div className="anim-1" style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Mercados</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          {markets.length} mercados activos · Actualizado en tiempo real
        </p>
      </div>

      <div className="anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', maxWidth: 560 }}>
            <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 14, color: 'var(--text-tertiary)' }}>🔍</span>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar mercados..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '11px 14px', fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }} />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearchParams(p => { p.delete('q'); return p }) }} style={{ background: 'transparent', border: 'none', padding: '0 12px', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
            )}
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_CATEGORIES.map(cat => {
              const isActive = cat === activeCategory
              const color = cat === 'Todos' ? 'var(--gold)' : CATEGORY_COLORS[cat] || 'var(--text-secondary)'
              return (
                <button key={cat} onClick={() => handleCategoryClick(cat)} style={{ background: isActive ? (cat === 'Todos' ? 'rgba(240,192,64,0.12)' : `${color}18`) : 'transparent', border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`, borderRadius: 99, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, color: isActive ? color : 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Plus Jakarta Sans' }}>
                  {cat}
                </button>
              )
            })}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}>
            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 20, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
        {loading ? 'Cargando...' : `${markets.length} mercado${markets.length !== 1 ? 's' : ''}${activeCategory !== 'Todos' ? ` en ${activeCategory}` : ''}${searchInput ? ` · "${searchInput}"` : ''}`}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, height: 200 }} />)}
        </div>
      ) : markets.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {markets.map((market, i) => <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>No encontramos mercados</p>
        </div>
      )}
    </div>
  )
}
