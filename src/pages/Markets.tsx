import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { CategoryBrowse } from '../components/CategoryBrowse'
import type { Category, Market } from '../types'
import { Tabs } from '../components/Tabs'
import { Icon } from '../components/Icon'
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
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>
            {t('markets.title')}
          </h1>
          <p className="meta-label" style={{ margin: 0 }}>
            {loading ? t('common.loading') : (
              <><span className="num" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{markets.length}</span>{' '}{t('markets.activeCount')}</>
            )}
          </p>
        </div>
        <Link to="/proponer" className="markets-page-cta btn btn-secondary">
          <Icon name="plus" size={14} strokeWidth={2} />
          {t('home.proposeCta')}
        </Link>
      </div>

      {/* Search + Controls */}
      <div className="anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
        {/* Search bar — solo móvil (en desktop el navbar ya busca) */}
        <form onSubmit={handleSearch} className="markets-page-search">
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 560, padding: '0 8px 0 12px', height: 44 }}>
            <Icon name="search" size={16} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchParams(p => { p.delete('q'); return p }) }}
                className="icon-btn"
                style={{ width: 28, height: 28 }}
                aria-label={t('common.close')}
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        </form>

        {/* Tabs de categoría (texto + subrayado, escriben ?cat=) + orden */}
        <div className="markets-controls tabs-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <Tabs<Category | 'Todos'>
            items={ALL_CATEGORIES.map(cat => ({ key: cat, label: cat === 'Todos' ? t('markets.allCategory') : cat }))}
            active={activeCategory}
            onChange={handleCategoryClick}
            style={{ minWidth: 0, flex: 1 }}
          />
          {activeCategory === 'Todos' && (
            <select
              className="input"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ height: 36, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 6, flexShrink: 0 }}
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
            <div className="meta-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="num">{t('markets.resultCount', { count: markets.length })}</span>
              {searchInput && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t('markets.searchLabel')} <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>"{searchInput}"</span>
                  <button
                    type="button"
                    aria-label={t('common.close')}
                    onClick={() => { setSearchInput(''); setSearchParams(p => { p.delete('q'); return p }) }}
                    className="icon-btn"
                    style={{ width: 22, height: 22 }}
                  >
                    <Icon name="x" size={12} />
                  </button>
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
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'var(--text-tertiary)',
              }}>
                <Icon name="search" size={22} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
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
