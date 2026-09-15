import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketCard } from '../components/MarketCard'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { PopularTopics } from '../components/PopularTopics'
import { CategoryBrowse } from '../components/CategoryBrowse'
import { CategoryBar, isFeed, type CategoryTab } from '../components/CategoryBar'
import { Icon } from '../components/Icon'
import { BetBox } from '../components/BetBox'
import { TradeSheet } from '../components/TradeSheet'
import { AuthModal } from '../components/AuthModal'
import type { Category, Market } from '../types'
import { SUBCATEGORIES } from '../lib/categories'
import { apiToMarket } from '../lib/mapMarket'
import { useMobile } from '../lib/useMobile'
import { selectNewMarkets } from '../lib/newMarkets'
import { SeeMoreButton } from '../components/SeeMoreButton'

type MobileTab = CategoryTab

const PAGE_SIZE = 12

// Sección de grid del desktop (Tendencia y Nuevo comparten título + "Ver todos" + paginado)
function MarketGridSection({ title, viewAllTo, emptyText, notice, markets, loading, visible, onMore }: {
  title: string; viewAllTo: string; emptyText: string; notice?: string
  markets: Market[]; loading: boolean; visible: number; onMore: () => void
}) {
  const { t } = useTranslation()
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title">{title}</h2>
        <Link to={viewAllTo} style={{
          textDecoration: 'none', fontSize: 13,
          color: 'var(--text-secondary)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {t('home.viewAll')}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
      {notice && !loading && (
        <p className="meta-label" style={{ margin: '0 0 16px' }}>{notice}</p>
      )}
      {loading ? (
        <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 210 }} />
          ))}
        </div>
      ) : markets.length > 0 ? (
        <>
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {markets.slice(0, visible).map((market, i) => (
              <MarketCard key={market.id} market={market} animClass={`anim-${Math.min(i + 1, 6)}`} />
            ))}
          </div>
          {markets.length > visible && (
            <SeeMoreButton remaining={markets.length - visible} onClick={onMore} />
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 600 }}>{emptyText}</p>
        </div>
      )}
    </section>
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
  const location = useLocation()
  const isMobile = useMobile()
  // Compra rápida desde la lista (móvil): el sheet lee el mercado vivo por id
  const [trade, setTrade] = useState<{ marketId: string; side: 'YES' | 'NO'; outcomeKey?: string } | null>(null)
  const [tradeOutcome, setTradeOutcome] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeTrade = useCallback(() => setTrade(null), [])

  useEffect(() => { setVisibleTrending(PAGE_SIZE) }, [mobileTab])

  // Clic en el logo (Link a "/") estando ya en Home: la ruta no cambia pero
  // location.key sí → volver a la pestaña Tendencia en vez de quedarse en la
  // categoría seleccionada.
  useEffect(() => { setMobileTab('Tendencia') }, [location.key])

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

  const tradeMarket = trade ? markets.find(m => m.id === trade.marketId) ?? null : null

  const openTrade = (marketId: string, side: 'YES' | 'NO', outcomeKey?: string) => {
    setTradeOutcome(outcomeKey ?? null)
    setTrade({ marketId, side, outcomeKey })
  }

  // Tras operar, la tarjeta refleja el precio nuevo
  const handleTraded = (marketId: string, newYesPrice: number, isMulti: boolean) => {
    setApiMarkets(prev => prev.map(m => (m.id === marketId ? { ...m, yes_price: newYesPrice } : m)))
    if (isMulti) {
      marketsApi.outcomes(marketId)
        .then(outcomes => setApiMarkets(prev => prev.map(m => (m.id === marketId ? { ...m, outcomes } : m))))
        .catch(() => {})
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/mercados?q=${encodeURIComponent(search)}`)
  }

  // Nuevo: solo los de ≤3 días; si no hay, los 12 más recientes con aviso
  const nuevos = useMemo(() => selectNewMarkets(markets), [markets])
  const filtered = (() => {
    if (mobileTab === 'Tendencia') return markets.filter(m => m.trending)
    if (mobileTab === 'Nuevo') return nuevos.items
    return markets.filter(m => m.category === mobileTab)
  })()
  const emptyText = mobileTab === 'Nuevo' ? t('home.noNew') : t('home.noTrending')
  const notice = mobileTab === 'Nuevo' && nuevos.fallback ? t('home.newFallback') : undefined

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

        {isFeed(mobileTab) ? (
          <>
            {/* Feed (Tendencia / Nuevo) estilo Polymarket: sin carrusel destacado,
                tarjetas compactas con Sí/No que abren la compra. Paginado como en desktop. */}
            <div style={{ padding: '12px 14px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notice && !loading && (
                <p className="meta-label" style={{ margin: '0 0 4px' }}>{notice}</p>
              )}
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 130 }} />
                ))
              ) : filtered.length > 0 ? (
                <>
                  {filtered.slice(0, visibleTrending).map((market, i) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      animClass={i < 6 ? `anim-${Math.min(i + 1, 6)}` : ''}
                      onQuickTrade={(side, outcomeKey) => openTrade(market.id, side, outcomeKey)}
                    />
                  ))}
                  {filtered.length > visibleTrending && (
                    <SeeMoreButton remaining={filtered.length - visibleTrending} onClick={() => setVisibleTrending(v => v + PAGE_SIZE)} />
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                  <p style={{ fontWeight: 600 }}>{emptyText}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: '14px 14px 80px' }}>
            <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
          </div>
        )}

        <TradeSheet open={!!tradeMarket} onClose={closeTrade}>
          {tradeMarket && trade && (
            <BetBox
              key={`${tradeMarket.id}-${trade.side}-${trade.outcomeKey ?? ''}`}
              marketId={tradeMarket.id}
              yesPrice={tradeMarket.yesPrice}
              marketType={tradeMarket.marketType === 'multi' ? 'multi' : 'binary'}
              outcomes={tradeMarket.outcomes ?? []}
              selectedOutcomeKey={tradeOutcome}
              onOutcomeSelect={setTradeOutcome}
              subcategory={tradeMarket.subcategory}
              initialSide={trade.side}
              compact
              onRequireAuth={() => { setTrade(null); setAuthOpen(true) }}
              onTraded={p => handleTraded(tradeMarket.id, p, tradeMarket.marketType === 'multi')}
            />
          )}
        </TradeSheet>
        {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}

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
          <MarketGridSection
            title={t('home.trendingMarkets')}
            viewAllTo="/mercados"
            emptyText={emptyText}
            markets={filtered}
            loading={loading}
            visible={visibleTrending}
            onMore={() => setVisibleTrending(v => v + PAGE_SIZE)}
          />
        </>
      ) : mobileTab === 'Nuevo' ? (
        /* Nuevo: solo el grid, sin carrusel ni temas populares */
        <MarketGridSection
          title={t('home.newMarkets')}
          viewAllTo="/mercados?sort=new"
          emptyText={emptyText}
          notice={notice}
          markets={filtered}
          loading={loading}
          visible={visibleTrending}
          onMore={() => setVisibleTrending(v => v + PAGE_SIZE)}
        />
      ) : (
        <section style={{ marginBottom: 56 }}>
          <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
        </section>
      )}
    </div>
    </>
  )
}
