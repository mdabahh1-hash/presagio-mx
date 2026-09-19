import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketGrid } from '../components/MarketGrid'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { PopularTopics } from '../components/PopularTopics'
import { CategoryBrowse } from '../components/CategoryBrowse'
import { PoliticaLanding, politicaLandingAvailable } from '../components/politica/PoliticaLanding'
import { DeportesLanding, deportesLandingAvailable } from '../components/deportes/DeportesLanding'
import { CryptoLanding, cryptoLandingAvailable, type CryptoSort } from '../components/crypto/CryptoLanding'
import { CategoryLanding, type CategorySort } from '../components/categoria/CategoryLanding'
import type { Ventana } from '../components/crypto/escalera'
import { CategoryBar, isFeed, type CategoryTab } from '../components/CategoryBar'
import { Icon } from '../components/Icon'
import type { Category, Market } from '../types'
import { SUBCATEGORIES, usaLandingGenerica, sportOfSub, type Kind } from '../lib/categories'
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
  // El feed vive en la URL (/ = Tendencia, /nuevo = Nuevo); las categorías filtran in-place
  const feedFromPath: MobileTab = location.pathname === '/nuevo' ? 'Nuevo' : 'Tendencia'
  const [mobileTab, setMobileTab] = useState<MobileTab>(feedFromPath)
  const [visibleTrending, setVisibleTrending] = useState(PAGE_SIZE)
  const navigate = useNavigate()
  const isMobile = useMobile()
  // Tema (?sub) de la landing de Política dentro de la Home: estado local, como
  // el sub interno de CategoryBrowse (la Home no sincroniza con la URL)
  const [homeSub, setHomeSub] = useState<string | null>(null)
  // Filtros de la landing de Deportes dentro de la Home (liga, deporte, tipo, día):
  // estado local como homeSub; /mercados los sincroniza con la URL
  const [homeDep, setHomeDep] = useState<{ sub: string | null; sport: string | null; kind: Kind | null; dia: string | null }>({ sub: null, sport: null, kind: null, dia: null })

  // Filtros de la landing de Crypto dentro de la Home (subcategoría, ventana, orden): estado local
  const [homeCrypto, setHomeCrypto] = useState<{ sub: string | null; ventana: Ventana | null; sort: CryptoSort }>({ sub: null, ventana: null, sort: 'ending' })
  // Filtros de la landing genérica de categoría dentro de la Home (subcategoría, orden): estado local
  const [homeCat, setHomeCat] = useState<{ sub: string | null; sort: CategorySort }>({ sub: null, sort: 'all' })

  useEffect(() => {
    setVisibleTrending(PAGE_SIZE); setHomeSub(null); setHomeDep({ sub: null, sport: null, kind: null, dia: null })
    setHomeCrypto({ sub: null, ventana: null, sort: 'ending' })
    setHomeCat({ sub: null, sort: 'all' })
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

  // Política filtra in-place como las demás, pero con su landing propia en vez
  // de CategoryBrowse (misma regla que /mercados?cat=Política)
  const showPolitica = mobileTab === 'Política' && politicaLandingAvailable(markets, loading)
  const politicaLanding = (
    <PoliticaLanding
      markets={markets}
      loading={loading}
      subcats={SUBCATEGORIES['Política'] ?? []}
      activeSub={homeSub}
      onSubChange={setHomeSub}
      onTraded={(id, p) => handleTraded(id, p, false)}
      showHeader
    />
  )

  // Deportes: misma regla que Política (in-place, con cabecera); una liga implica su deporte
  const showDeportes = mobileTab === 'Deportes' && deportesLandingAvailable(markets, loading)
  const deportesLanding = (
    <DeportesLanding
      markets={markets}
      loading={loading}
      subcats={SUBCATEGORIES['Deportes'] ?? []}
      activeSub={homeDep.sub}
      onSubChange={sub => setHomeDep(d => ({ ...d, sub, sport: sub ? (sportOfSub(sub) ?? sub) : d.sport, kind: null }))}
      activeSport={homeDep.sport}
      onSportChange={sport => setHomeDep(d => ({ ...d, sport, sub: null, kind: null }))}
      activeKind={homeDep.kind}
      onKindChange={kind => setHomeDep(d => ({ ...d, kind }))}
      activeDia={homeDep.dia}
      onDiaChange={dia => setHomeDep(d => ({ ...d, dia }))}
      onTraded={handleTraded}
      showHeader
    />
  )

  // Crypto: misma regla que Política y Deportes (in-place, con cabecera)
  const showCrypto = mobileTab === 'Crypto' && cryptoLandingAvailable(markets, loading)
  const cryptoLanding = (
    <CryptoLanding
      markets={markets}
      loading={loading}
      subcats={SUBCATEGORIES['Crypto'] ?? []}
      activeSub={homeCrypto.sub}
      onSubChange={sub => setHomeCrypto(c => ({ ...c, sub }))}
      ventana={homeCrypto.ventana}
      onVentanaChange={ventana => setHomeCrypto(c => ({ ...c, ventana }))}
      onClear={() => setHomeCrypto(c => ({ ...c, sub: null, ventana: null }))}
      sort={homeCrypto.sort}
      onSortChange={sort => setHomeCrypto(c => ({ ...c, sort }))}
      onTraded={handleTraded}
      showHeader
    />
  )

  // Cualquier otra categoría: landing genérica, siempre (in-place, con cabecera)
  const showCategoria = usaLandingGenerica(mobileTab)
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
    />
  )

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
            {showPolitica ? politicaLanding : showDeportes ? deportesLanding : showCrypto ? cryptoLanding : showCategoria ? categoriaLanding : (
              <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
            )}
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
          {showPolitica ? politicaLanding : showDeportes ? deportesLanding : showCrypto ? cryptoLanding : showCategoria ? categoriaLanding : (
            <CategoryBrowse category={mobileTab as Category} markets={markets} loading={loading} subcats={SUBCATEGORIES[mobileTab as Category]} />
          )}
        </section>
      )}
    </div>
    </>
  )
}
