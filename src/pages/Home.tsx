import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { PopularTopics } from '../components/PopularTopics'
import { CategoryBrowse } from '../components/CategoryBrowse'
import { CategoryBar } from '../components/CategoryBar'
import type { Category, Market } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { CATEGORIES, SUBCATEGORIES } from '../lib/categories'
import { apiToMarket } from '../lib/mapMarket'
import { useMobile } from '../lib/useMobile'

const MOBILE_TABS = ['Tendencia', ...CATEGORIES] as const
type MobileTab = Category | 'Tendencia'

const PAGE_SIZE = 12

function SeeMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <button
        onClick={onClick}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-default)',
          borderRadius: 99, padding: '12px 28px', minHeight: 44,
          color: 'var(--text-secondary)',
          fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.84rem',
          cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--oro)'
          e.currentTarget.style.color = 'var(--oro)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        {t('home.seeMore', { count: remaining })}
      </button>
    </div>
  )
}

export function Home() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [apiMarkets, setApiMarkets] = useState<ApiMarket[]>([])
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileTab, setMobileTab] = useState<MobileTab>('Tendencia')
  const [visibleTrending, setVisibleTrending] = useState(PAGE_SIZE)
  const navigate = useNavigate()
  const isMobile = useMobile()

  useEffect(() => { setVisibleTrending(PAGE_SIZE) }, [mobileTab])

  useEffect(() => {
    // Paginado completo: el top-100 por volumen dejaba fuera ligas enteras
    // (con volumen 0 el desempate es por id, y nfl-*/pl-* caían del corte).
    marketsApi.listAll()
      .then(data => setApiMarkets(data))
      .catch(() => setUsingMock(true))
      .finally(() => setLoading(false))
  }, [])

  const markets = useMemo<Market[]>(
    () => (usingMock ? MOCK_MARKETS : apiMarkets.map(apiToMarket)),
    [apiMarkets, usingMock],
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/mercados?q=${encodeURIComponent(search)}`)
  }

  const filtered = (() => {
    if (mobileTab === 'Tendencia') return markets.filter(m => m.trending)
    return markets.filter(m => m.category === mobileTab)
  })()

  // ─── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh' }}>

        {/* Sticky search + tabs */}
        <div style={{
          position: 'sticky', top: 62, zIndex: 50,
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '10px 14px 0',
        }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <span style={{ paddingLeft: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', padding: '11px 12px',
                  fontSize: '0.9rem', color: 'var(--text-primary)',
                  fontFamily: 'DM Sans',
                }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', padding: '0 12px', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              )}
            </div>
          </form>

          {/* Category tabs — horizontal scroll */}
          <div style={{
            display: 'flex', gap: 8,
            overflowX: 'auto', paddingBottom: 10,
            scrollbarWidth: 'none',
          }}>
            {MOBILE_TABS.map(tab => {
              const isActive = tab === mobileTab
              const color = tab === 'Tendencia' ? 'var(--oro)' : getCategoryColor(tab)
          const activeBg = tab === 'Tendencia' ? 'var(--oro-dim)' : getCategoryBg(tab)
              return (
                <button
                  key={tab}
                  className="mobile-cat-tab"
                  onClick={() => setMobileTab(tab)}
                  style={{
                    flexShrink: 0,
                    background: isActive ? activeBg : 'transparent',
                    border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
                    borderRadius: 99, padding: '7px 14px',
                    fontSize: '0.8rem', fontWeight: 700,
                    color: isActive ? color : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'DM Sans',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab === 'Tendencia' ? t('home.tabTrending') : tab}
                </button>
              )
            })}
          </div>
        </div>

        {mobileTab === 'Tendencia' ? (
          <>
            {/* Featured carousel */}
            {!loading && (
              <div style={{ padding: '14px 14px 4px' }}>
                <div className="exchange-header" style={{ marginBottom: 12 }}>{t('home.featuredMarket')}</div>
                <FeaturedCarousel markets={apiMarkets} />
              </div>
            )}

            {/* Trending list — paginado como en desktop (antes pintaba las 40+
                tarjetas de golpe: una página de 11,000px) */}
            <div style={{ padding: '10px 14px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 130 }} />
                ))
              ) : filtered.length > 0 ? (
                <>
                  {filtered.slice(0, visibleTrending).map(market => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                  {filtered.length > visibleTrending && (
                    <SeeMoreButton remaining={filtered.length - visibleTrending} onClick={() => setVisibleTrending(v => v + PAGE_SIZE)} />
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                  <p style={{ fontWeight: 600 }}>{t('home.noTrending')}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: '14px 14px 80px' }}>
            <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
          </div>
        )}

      </div>
    )
  }

  // ─── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ paddingTop: 20 }}>

      {/* One-line category tabs */}
      <CategoryBar active={mobileTab} onChange={setMobileTab} />

      {mobileTab === 'Tendencia' ? (
        <>
          {/* Featured carousel + Temas populares */}
          <section className="featured-row" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start', marginBottom: 48 }}>
            {loading ? (
              <div className="skeleton" style={{ height: 420 }} />
            ) : (
              <FeaturedCarousel markets={apiMarkets} />
            )}
            <div className="featured-side">
              {loading ? (
                <div className="skeleton" style={{ height: 420 }} />
              ) : (
                <PopularTopics markets={markets} />
              )}
            </div>
          </section>

          {/* Trending markets grid */}
          <section style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="exchange-header">{t('home.trendingMarkets')}</div>
              <Link to="/mercados" style={{
                textDecoration: 'none', fontSize: '0.8rem',
                color: 'var(--blue)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {t('home.viewAll')}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
            {loading ? (
              <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 210 }} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {filtered.slice(0, visibleTrending).map(market => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
                {filtered.length > visibleTrending && (
                  <SeeMoreButton remaining={filtered.length - visibleTrending} onClick={() => setVisibleTrending(v => v + PAGE_SIZE)} />
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <p style={{ fontWeight: 600 }}>{t('home.noTrending')}</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <section style={{ marginBottom: 56 }}>
          <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
        </section>
      )}
    </div>
  )
}
