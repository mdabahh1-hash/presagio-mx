import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketGrid } from '../components/MarketGrid'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { PopularTopics } from '../components/PopularTopics'
import { PoliticaLanding } from '../components/politica/PoliticaLanding'
import { DeportesLanding } from '../components/deportes/DeportesLanding'
import { CryptoLanding } from '../components/crypto/CryptoLanding'
import { PanelCard, PanelBack, panelDisponible } from '../components/categoria/PanelCard'
import { CategoryLanding, type CategorySort } from '../components/categoria/CategoryLanding'
import { CategoryBar, isFeed, type CategoryTab } from '../components/CategoryBar'
import { Icon } from '../components/Icon'
import type { Category, Market } from '../types'
import { CATEGORIES, SUBCATEGORIES } from '../lib/categories'
import { apiToMarket } from '../lib/mapMarket'
import { useMobile } from '../lib/useMobile'
import { SeeMoreButton } from '../components/SeeMoreButton'
import { NewFeed } from '../components/NewFeed'

type MobileTab = CategoryTab

const PAGE_SIZE = 12

// Sección de grid de Tendencia en desktop (título + "Ver todos" + paginado)
function MarketGridSection({ title, viewAllTo, emptyText, markets, loading, visible, onMore, onTraded }: {
  title: string; viewAllTo: string; emptyText: string
  markets: Market[]; loading: boolean; visible: number; onMore: () => void
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
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
      {loading ? (
        <MarketGrid markets={[]} onTraded={onTraded} loading skeletons={9} />
      ) : markets.length > 0 ? (
        <>
          <MarketGrid markets={markets.slice(0, visible)} onTraded={onTraded} />
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
  const location = useLocation()
  // El feed vive en la URL (/ = Tendencia, /nuevo = Nuevo); las categorías filtran in-place.
  // /?cat=X llega desde la barra de otras páginas (Noticias, Perfil) y abre la
  // portada ya en esa categoría, sin salir a /mercados.
  const catFromUrl = new URLSearchParams(location.search).get('cat')
  const feedFromPath: MobileTab = location.pathname === '/nuevo' ? 'Nuevo'
    : catFromUrl && (CATEGORIES as readonly string[]).includes(catFromUrl) ? catFromUrl as Category
    : 'Tendencia'
  const [mobileTab, setMobileTab] = useState<MobileTab>(feedFromPath)
  const [visibleTrending, setVisibleTrending] = useState(PAGE_SIZE)
  const navigate = useNavigate()
  const isMobile = useMobile()
  // Liga y día del panel de Deportes dentro de la Home: estado local; /mercados los
  // sincroniza con la URL
  const [homeDep, setHomeDep] = useState<{ sub: string | null; dia: string | null }>({ sub: null, dia: null })
  // Filtros de la landing genérica de categoría dentro de la Home (subcategoría, orden): estado local
  const [homeCat, setHomeCat] = useState<{ sub: string | null; sort: CategorySort }>({ sub: null, sort: 'all' })
  // Deportes, Política y Crypto: landing con gráficas abierta desde la tarjeta panel (estado local)
  const [homePanel, setHomePanel] = useState(false)

  useEffect(() => {
    setVisibleTrending(PAGE_SIZE); setHomeDep({ sub: null, dia: null })
    setHomeCat({ sub: null, sort: 'all' }); setHomePanel(false)
  }, [mobileTab])

  // Clic en el logo (Link a "/") o en Tendencia/Nuevo estando ya en Home: la
  // ruta puede no cambiar pero location.key sí → volver al feed de la URL en
  // vez de quedarse en la categoría seleccionada.
  useEffect(() => { setMobileTab(feedFromPath) }, [location.key, feedFromPath])

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

  // Tendencia; la pestaña Nuevo se filtra dentro de NewFeed
  const filtered = mobileTab === 'Tendencia' ? markets.filter(m => m.trending) : markets.filter(m => m.category === mobileTab)
  const emptyText = t('home.noTrending')

  // Deportes, Política y Crypto abren con el grid como las demás; la tarjeta panel
  // monta su landing con gráficas in-place (misma regla que /mercados?vista=panel).
  // Al entrar o salir, los filtros de ambas vistas vuelven a cero.
  const panelOk = panelDisponible(mobileTab, markets, loading)
  const panelAbierto = homePanel && panelOk
  const setPanel = (open: boolean) => {
    setHomePanel(open)
    setHomeDep({ sub: null, dia: null }); setHomeCat({ sub: null, sort: 'all' })
    window.scrollTo({ top: 0 })
  }
  const showPolitica = panelAbierto && mobileTab === 'Política'
  const politicaLanding = (
    <PoliticaLanding
      markets={markets}
      loading={loading}
      onTraded={(id, p) => handleTraded(id, p, false)}
      showHeader
    />
  )

  // Deportes: misma regla que Política (in-place, con cabecera)
  const showDeportes = panelAbierto && mobileTab === 'Deportes'
  const deportesLanding = (
    <DeportesLanding
      markets={markets}
      loading={loading}
      activeSub={homeDep.sub}
      onSubChange={sub => setHomeDep(d => ({ ...d, sub }))}
      activeDia={homeDep.dia}
      onDiaChange={dia => setHomeDep(d => ({ ...d, dia }))}
      showHeader
    />
  )

  // Crypto: misma regla que Política y Deportes (in-place, con cabecera)
  const cryptoLanding = (
    <CryptoLanding
      markets={markets}
      loading={loading}
      subcats={SUBCATEGORIES['Crypto'] ?? []}
      onTraded={handleTraded}
      showHeader
    />
  )

  // Cualquier categoría fuera del panel: landing genérica (in-place, con cabecera)
  const categoriaLanding = (
    <CategoryLanding
      category={mobileTab as Category}
      markets={markets}
      loading={loading}
      subcats={SUBCATEGORIES[mobileTab as Category] ?? []}
      activeSub={homeCat.sub}
      onSubChange={sub => setHomeCat(c => ({ ...c, sub }))}
      sort={homeCat.sort}
      onSortChange={sort => setHomeCat(c => ({ ...c, sort }))}
      onTraded={handleTraded}
      showHeader
      feature={panelOk && <PanelCard category={mobileTab as Category} markets={markets} onOpen={() => setPanel(true)} />}
    />
  )
  const categoria = panelAbierto ? (
    <>
      <PanelBack category={mobileTab as Category} onBack={() => setPanel(false)} />
      {showPolitica ? politicaLanding : showDeportes ? deportesLanding : cryptoLanding}
    </>
  ) : categoriaLanding

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

        {mobileTab === 'Nuevo' ? (
          <div style={{ padding: '16px 14px 80px' }}>
            <NewFeed markets={markets} loading={loading} onTraded={handleTraded} />
          </div>
        ) : isFeed(mobileTab) ? (
          <>
            {/* Feed Tendencia: sin carrusel destacado, la misma tarjeta y grid que el resto
                del sitio (1 columna en teléfono). Paginado como en desktop. */}
            <div style={{ padding: '12px 14px 80px' }}>
              {loading || filtered.length > 0 ? (
                <>
                  <MarketGrid markets={filtered.slice(0, visibleTrending)} onTraded={handleTraded} loading={loading} skeletons={5} />
                  {!loading && filtered.length > visibleTrending && (
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
            {categoria}
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
          {/* Featured carousel + Explora por tema */}
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
            onTraded={handleTraded}
          />
        </>
      ) : mobileTab === 'Nuevo' ? (
        /* Nuevo: página propia estilo Polymarket (píldoras + filtros + grid) */
        <NewFeed markets={markets} loading={loading} onTraded={handleTraded} />
      ) : (
        <section style={{ marginBottom: 56 }}>
          {categoria}
        </section>
      )}
    </div>
    </>
  )
}
