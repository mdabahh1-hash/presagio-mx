import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { CategoryBrowse } from '../components/CategoryBrowse'
import type { Category, Market } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { CATEGORIES, SUBCATEGORIES, sportOfSub } from '../lib/categories'
import { apiToMarket } from '../lib/mapMarket'

const ALL_CATEGORIES: (Category | 'Todos')[] = ['Todos', ...CATEGORIES]

export function Markets() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sortOptions = [
    { value: 'volume', label: t('markets.sortVolume') },
    { value: 'trending', label: t('markets.sortTrending') },
    { value: 'ending', label: t('markets.sortEnding') },
  ]
  const [sortBy, setSortBy] = useState('volume')
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  const queryParam = searchParams.get('q') || ''
  const catParam = (searchParams.get('cat') || 'Todos') as Category | 'Todos'
  const subParam = searchParams.get('sub')
  const sportParam = searchParams.get('sport')
  const [searchInput, setSearchInput] = useState(queryParam)
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(catParam)
  const [activeSub, setActiveSub] = useState<string | null>(subParam)
  const [activeSport, setActiveSport] = useState<string | null>(sportParam)

  useEffect(() => {
    setSearchInput(queryParam)
    setActiveCategory(catParam)
    setActiveSub(subParam)
    setActiveSport(sportParam)
  }, [queryParam, catParam, subParam, sportParam])

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = {
      category: activeCategory !== 'Todos' ? activeCategory : undefined,
      q: searchInput || undefined,
      sort: sortBy,
    }
    // Una categoría se lista completa (paginado); "Todos" conserva el top-100 por volumen.
    const req = activeCategory !== 'Todos'
      ? marketsApi.listAll(params)
      : marketsApi.list({ ...params, limit: 100 })
    req
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
    setActiveSub(null)
    setActiveSport(null)
    setSearchParams(p => {
      if (cat === 'Todos') p.delete('cat')
      else p.set('cat', cat)
      p.delete('sub')
      p.delete('sport')
      return p
    })
  }

  const handleSubChange = (sub: string | null) => {
    // Una liga implica su deporte (Deportes); en otras categorías no hay deporte.
    const sport = sub && activeCategory === 'Deportes' ? (sportOfSub(sub) ?? sub) : activeSport
    setActiveSub(sub)
    setActiveSport(sport)
    setSearchParams(p => {
      if (sub) p.set('sub', sub)
      else p.delete('sub')
      if (sport) p.set('sport', sport)
      else p.delete('sport')
      return p
    })
  }

  const handleSportChange = (sport: string | null) => {
    setActiveSport(sport)
    setActiveSub(null)
    setSearchParams(p => {
      if (sport) p.set('sport', sport)
      else p.delete('sport')
      p.delete('sub')
      return p
    })
  }

  return (
    <div className="page-container" style={{ paddingTop: 36, paddingBottom: 36 }}>

      {/* Page header */}
      <div className="anim-1" style={{
        marginBottom: 36, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 className="font-display" style={{
            fontSize: '2.2rem', fontWeight: 700,
            letterSpacing: '-0.04em', margin: '0 0 8px',
          }}>
            {t('markets.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {loading ? (
              <span style={{ color: 'var(--text-tertiary)' }}>{t('common.loading')}</span>
            ) : (
              <>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>{markets.length}</span>
                {' '}{t('markets.activeCount')}
              </>
            )}
          </p>
        </div>
        <Link to="/proponer" className="markets-page-cta" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 20px', borderRadius: 12, textDecoration: 'none',
          border: '1px solid var(--gold)', color: 'var(--gold)',
          background: 'var(--oro-dim)', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {t('home.proposeCta')}
        </Link>
      </div>

      {/* Search + Controls */}
      <div className="anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
        {/* Search bar — solo móvil (en desktop el navbar ya busca) */}
        <form onSubmit={handleSearch} className="markets-page-search">
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
              placeholder={t('home.searchPlaceholder')}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', padding: '13px 14px',
                fontSize: '0.875rem', color: 'var(--text-primary)',
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
              const color = cat === 'Todos' ? 'var(--blue)' : getCategoryColor(cat)
              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  style={{
                    background: isActive
                      ? cat === 'Todos' ? 'var(--oro-dim)' : getCategoryBg(cat)
                      : 'transparent',
                    border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
                    borderRadius: 99, padding: '7px 14px',
                    fontSize: '0.78rem', fontWeight: 600,
                    color: isActive ? color : 'var(--text-tertiary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {cat === 'Todos' ? t('markets.allCategory') : cat}
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
              }}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {activeCategory !== 'Todos' ? (
        /* Category view — same sidebar layout as the home page */
        <CategoryBrowse
          category={activeCategory}
          markets={markets}
          loading={loading}
          subcats={SUBCATEGORIES[activeCategory]}
          activeSub={activeSub}
          onSubChange={handleSubChange}
          activeSport={activeSport}
          onSportChange={handleSportChange}
        />
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
              }}>
                {t('markets.resultCount', { count: markets.length })}
              </span>
              {searchInput && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t('markets.searchLabel')} <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>"{searchInput}"</span>
                  <button
                    type="button"
                    aria-label={t('common.close')}
                    onClick={() => { setSearchInput(''); setSearchParams(p => { p.delete('q'); return p }) }}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 99,
                      width: 22, height: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--text-tertiary)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', padding: 0,
                    }}
                  >×</button>
                </span>
              )}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 210 }} />
              ))}
            </div>
          ) : markets.length > 0 ? (
            <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {markets.map(market => (
                <MarketCard key={market.id} market={market} />
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
                {t('markets.emptyTitle')}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                {t('markets.emptySubtitle')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
