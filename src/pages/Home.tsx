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
import { Icon } from '../components/Icon'
import type { Category, Market } from '../types'
import { SUBCATEGORIES } from '../lib/categories'
import { apiToMarket } from '../lib/mapMarket'
import { useMobile } from '../lib/useMobile'

type MobileTab = Category | 'Tendencia'

const PAGE_SIZE = 12

function SeeMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <button className="btn btn-secondary" onClick={onClick} style={{ minHeight: 44, padding: '0 24px' }}>
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

        {/* Buscador + tabs de categoría, pegados bajo el navbar (mismo
            componente que en desktop; la línea inferior no se mueve) */}
        <CategoryBar active={mobileTab} onChange={setMobileTab}>
          <form onSubmit={handleSearch} style={{ padding: '10px 0 4px' }}>
            <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
              <Icon name="search" size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label={t('common.close')} className="icon-btn" style={{ width: 28, height: 28 }}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          </form>
        </CategoryBar>

        {mobileTab === 'Tendencia' ? (
          <>
            {/* Featured carousel */}
            {!loading && (
              <div style={{ padding: '16px 16px 4px' }}>
                <h2 className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>{t('home.featuredMarket')}</h2>
                <FeaturedCarousel markets={markets} />
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
    <>
    {/* Barra de categorías full-bleed y sticky (fuera del container) */}
    <CategoryBar active={mobileTab} onChange={setMobileTab} />
    <div className="page-container" style={{ paddingTop: 24 }}>

      {mobileTab === 'Tendencia' ? (
        <>
          {/* Featured carousel + Temas populares */}
          <section className="featured-row" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start', marginBottom: 48 }}>
            {loading ? (
              <div className="skeleton" style={{ height: 420 }} />
            ) : (
              <FeaturedCarousel markets={markets} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="section-title">{t('home.trendingMarkets')}</h2>
              <Link to="/mercados" style={{
                textDecoration: 'none', fontSize: 13,
                color: 'var(--text-secondary)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {t('home.viewAll')}
                <Icon name="arrow-right" size={14} />
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
    </>
  )
}
