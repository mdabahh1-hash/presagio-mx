import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { PopularTopics } from '../components/PopularTopics'
import { CategoryBrowse } from '../components/CategoryBrowse'
import type { Category, Market } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { CATEGORIES, SUBCATEGORIES } from '../lib/categories'

const MOBILE_TABS = ['Tendencia', ...CATEGORIES] as const
type MobileTab = Category | 'Tendencia'


function apiToMarket(m: ApiMarket): Market {
  return {
    id: m.id,
    question: m.question,
    description: m.description,
    category: m.category as Category,
    subcategory: m.subcategory ?? null,
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

function useMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export function Home() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [apiMarkets, setApiMarkets] = useState<ApiMarket[]>([])
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileTab, setMobileTab] = useState<MobileTab>('Tendencia')
  const [visibleTrending, setVisibleTrending] = useState(12)
  const navigate = useNavigate()
  const isMobile = useMobile()

  useEffect(() => { setVisibleTrending(12) }, [mobileTab])

  useEffect(() => {
    marketsApi.list({ limit: 100 })
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

            {/* Trending list */}
            <div style={{ padding: '10px 14px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 14, height: 130,
                    animation: 'livePulse 1.8s ease infinite',
                  }} />
                ))
              ) : filtered.length > 0 ? (
                filtered.map((market, i) => (
                  <MarketCard key={market.id} market={market} animClass={i < 6 ? `anim-${Math.min(i + 1, 6)}` : ''} />
                ))
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
      <div className="cat-tabs tabs-scroll anim-1" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 24 }}>
        {MOBILE_TABS.map(tab => {
          const isActive = tab === mobileTab
          const color = tab === 'Tendencia' ? 'var(--oro)' : getCategoryColor(tab)
          const activeBg = tab === 'Tendencia' ? 'var(--oro-dim)' : getCategoryBg(tab)
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                flexShrink: 0,
                background: isActive ? activeBg : 'var(--bg-card)',
                border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
                borderRadius: 99, padding: '8px 16px',
                fontSize: '0.82rem', fontWeight: 700,
                color: isActive ? color : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'DM Sans', whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'Tendencia' ? t('home.tabTrending') : tab}
            </button>
          )
        })}
      </div>

      {mobileTab === 'Tendencia' ? (
        <>
          {/* Featured carousel + Temas populares */}
          <section className="featured-row" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start', marginBottom: 48 }}>
            {loading ? (
              <div className="card" style={{ height: 420, animation: 'livePulse 1.8s ease infinite' }} />
            ) : (
              <FeaturedCarousel markets={apiMarkets} />
            )}
            <div className="featured-side">
              {loading ? (
                <div className="card" style={{ height: 420, animation: 'livePulse 1.8s ease infinite' }} />
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
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, height: 210 }} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <>
                <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {filtered.slice(0, visibleTrending).map((market, i) => (
                    <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />
                  ))}
                </div>
                {filtered.length > visibleTrending && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button
                      onClick={() => setVisibleTrending(v => v + 12)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-default)',
                        borderRadius: 99, padding: '10px 28px',
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
                      {t('home.seeMore', { count: filtered.length - visibleTrending })}
                    </button>
                  </div>
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
