import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, peekAllMarkets } from '../lib/api'
import { MARKETS as MOCK_MARKETS } from '../data/markets'
import { MarketGrid } from '../components/MarketGrid'
import { PoliticaLanding } from '../components/politica/PoliticaLanding'
import { DeportesLanding } from '../components/deportes/DeportesLanding'
import { CryptoLanding, CryptoHeaderMeta } from '../components/crypto/CryptoLanding'
import { PanelCard, PanelBack, panelDisponible } from '../components/categoria/PanelCard'
import { CategoryLanding, CategoryBreadcrumb, CategoryHeaderMeta, isCategorySort, type CategorySort } from '../components/categoria/CategoryLanding'
import { diaKeyOf } from '../lib/jornada'
import type { Category, Market } from '../types'
import { Tabs } from '../components/Tabs'
import { Icon } from '../components/Icon'
import { CATEGORIES, SUBCATEGORIES, usaLandingGenerica, tienePanel } from '../lib/categories'
import { apiToMarket, cleanLabel } from '../lib/mapMarket'
import { selectNewMarkets } from '../lib/newMarkets'
import { useCategoriasVisibles } from '../lib/useCategoriasVisibles'
import { formatVolume } from '../lib/format'

export function Markets() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sortOptions = [
    { value: 'volume', label: t('markets.sortVolume') },
    { value: 'trending', label: t('markets.sortTrending') },
    { value: 'ending', label: t('markets.sortEnding') },
    { value: 'new', label: t('markets.sortNew') },
  ]
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  // Pestañas: las categorías sin mercados activos (y sin landing propia) no se listan
  const allCategories: (Category | 'Todos')[] = ['Todos', ...useCategoriasVisibles()]

  const queryParam = searchParams.get('q') || ''
  const catParam = (searchParams.get('cat') || 'Todos') as Category | 'Todos'
  const subParam = searchParams.get('sub')
  // Día de la jornada de Deportes (hoy | manana | AAAA-MM-DD | later | pending), enlazable
  const diaParam = searchParams.get('dia')
  // ?sort= vive en la URL para que la pestaña "Nuevo" de la barra (/mercados?sort=new) sea enlazable
  const rawSort = searchParams.get('sort')
  const sortParam = sortOptions.some(o => o.value === rawSort) ? (rawSort as string) : 'volume'
  const categoriaSort: CategorySort = isCategorySort(rawSort) ? rawSort : 'all'
  // Deportes, Política y Crypto: ?vista=panel abre la landing con gráficas; sin él, el grid
  const vistaPanel = searchParams.get('vista') === 'panel'
  const [searchInput, setSearchInput] = useState(queryParam)
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>(catParam)
  const [activeSub, setActiveSub] = useState<string | null>(subParam)
  const [activeDia, setActiveDia] = useState<string | null>(diaParam)
  const [sortBy, setSortBy] = useState(sortParam)

  useEffect(() => {
    setSearchInput(queryParam)
    setActiveCategory(catParam)
    setActiveSub(subParam)
    setActiveDia(diaParam)
    setSortBy(sortParam)
  }, [queryParam, catParam, subParam, diaParam, sortParam])

  // La búsqueda pide al API 300 ms después de la última tecla, no una vez por tecla
  const [fetchQ, setFetchQ] = useState(searchInput)
  useEffect(() => {
    const id = setTimeout(() => setFetchQ(searchInput), 300)
    return () => clearTimeout(id)
  }, [searchInput])

  // Toda categoría ordena en el cliente (?sort= propio): cambiar de orden no vuelve a pedir la lista
  const fetchSort = activeCategory === 'Todos' ? sortBy : 'volume'
  // ?cat= viene del querystring: una categoría que no existe no se pide (el catch
  // de abajo metería los mocks como si fueran de esa categoría)
  const validCategory = activeCategory === 'Todos' || (CATEGORIES as readonly string[]).includes(activeCategory)
  useEffect(() => {
    let active = true
    if (!validCategory) { setMarkets([]); setLoading(false); return }
    const params = {
      category: activeCategory !== 'Todos' ? activeCategory : undefined,
      q: fetchQ || undefined,
      sort: fetchSort,
    }
    // Categoría ya vista (Atrás desde un mercado): se pinta con la lista anterior mientras llega la fresca
    const hit = activeCategory !== 'Todos' ? peekAllMarkets(params) : undefined
    if (hit) { setMarkets(hit.map(apiToMarket)); setLoading(false) } else setLoading(true)
    // Una categoría se lista completa (paginado); "Todos" conserva el top-100 por volumen.
    const req = activeCategory !== 'Todos'
      ? marketsApi.listAll(params)
      : marketsApi.list({ ...params, limit: 100 })
    req
      .then(data => { if (active) setMarkets(data.map(apiToMarket)) })
      .catch(() => { if (active) setMarkets(MOCK_MARKETS.map(m => ({ ...m, yesPrice: m.yesPrice }))) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }  // drop out-of-order responses from fast typing / tab switches
  }, [activeCategory, fetchQ, fetchSort, validCategory])

  // "Nuevos (3 días)": el API ordena por siembra; el recorte a 3 días (y el
  // respaldo de los 12 más recientes) es de UI, compartido con la Home.
  const nuevos = useMemo(() => (sortBy === 'new' ? selectNewMarkets(markets) : null), [markets, sortBy])
  const shown = nuevos ? nuevos.items : markets
  const notice = nuevos?.fallback ? t('home.newFallback') : null

  // Deportes, Política y Crypto abren con el grid como las demás; su landing con
  // gráficas (?vista=panel) se monta si tiene qué mostrar (un trending abierto,
  // panelDisponible) y no hay búsqueda. Misma regla que la Home.
  const panelAbierto = vistaPanel && !searchInput && panelDisponible(activeCategory, markets, loading)
  const showLanding = panelAbierto && activeCategory === 'Política'
  const showDeportes = panelAbierto && activeCategory === 'Deportes'
  const showCrypto = panelAbierto && activeCategory === 'Crypto'
  // Cualquier categoría fuera del panel: landing genérica (components/categoria),
  // siempre que no haya búsqueda; con ?q= cae al grid de «Todos», que trae el
  // contador y el botón para limpiar la búsqueda
  const showCategoria = (usaLandingGenerica(activeCategory) || tienePanel(activeCategory)) && !searchInput && !panelAbierto
  const categoryVolume = useMemo(() => markets.reduce((sum, m) => sum + m.volume, 0), [markets])
  const abiertos = useMemo(() => markets.filter(m => m.status === 'open').length, [markets])
  const hoy = useMemo(() => markets.filter(m => diaKeyOf(m) === 'hoy').length, [markets])
  // Tras operar desde una landing: precio nuevo y, en un multi, opciones frescas
  const patchPrice = useCallback((id: string, yes: number, isMulti = false) => {
    setMarkets(prev => prev.map(m => (m.id === id ? { ...m, yesPrice: Math.round(yes) } : m)))
    if (isMulti) {
      marketsApi.outcomes(id)
        .then(outcomes => setMarkets(prev => prev.map(m => (m.id === id ? { ...m, outcomes: outcomes.map(o => ({ ...o, label: cleanLabel(o.label) })) } : m))))
        .catch(() => {})
    }
  }, [])

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
    setActiveDia(null)
    setSearchParams(p => {
      if (cat === 'Todos') p.delete('cat')
      else p.set('cat', cat)
      p.delete('sub')
      p.delete('sport')
      p.delete('kind')
      p.delete('dia')
      p.delete('ventana')
      p.delete('sort')  // el orden solo existe en "Todos" (y en las landings de Crypto y genérica)
      p.delete('vista')
      return p
    })
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
    setSearchParams(p => {
      if (sort === 'volume') p.delete('sort')
      else p.set('sort', sort)
      return p
    })
  }

  const handleSubChange = (sub: string | null) => {
    setActiveSub(sub)
    setSearchParams(p => {
      if (sub) p.set('sub', sub)
      else p.delete('sub')
      return p
    })
  }

  // Orden de la landing genérica ('all' es el default y no se escribe)
  const handleCategoriaSort = (s: CategorySort) => {
    setSearchParams(p => {
      if (s === 'all') p.delete('sort')
      else p.set('sort', s)
      return p
    })
  }

  // Día de la jornada (landing de Deportes)
  const handleDiaChange = (dia: string | null) => {
    setActiveDia(dia)
    setSearchParams(p => {
      if (dia) p.set('dia', dia)
      else p.delete('dia')
      return p
    })
  }

  // Entrar o salir del panel: cada vista tiene sus filtros (el ?sort= de Crypto y el
  // del grid chocan), así que se limpian todos
  const setPanel = (open: boolean) => {
    setSearchParams(p => {
      for (const k of ['sub', 'sport', 'kind', 'dia', 'ventana', 'sort']) p.delete(k)
      if (open) p.set('vista', 'panel')
      else p.delete('vista')
      return p
    })
    window.scrollTo({ top: 0 })
  }
  const panelBack = <PanelBack category={activeCategory as Category} onBack={() => setPanel(false)} />

  return (
    <div className="page-container" style={{ paddingTop: 36, paddingBottom: 36 }}>

      {/* Page header */}
      <div className="anim-1" style={{
        marginBottom: 36, display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          {showCategoria && activeSub && <CategoryBreadcrumb category={activeCategory as Category} sub={activeSub} onRoot={() => handleSubChange(null)} />}
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>
            {showCategoria ? (activeSub ?? activeCategory) : showLanding || showDeportes || showCrypto ? activeCategory : t('markets.title')}
          </h1>
          <p className="meta-label" style={{ margin: 0 }}>
            {loading ? t('common.loading') : showCrypto ? (
              <CryptoHeaderMeta markets={markets} sub={null} />
            ) : showCategoria ? (
              <CategoryHeaderMeta category={activeCategory as Category} markets={markets} sub={activeSub} />
            ) : showLanding ? (
              <span className="num">{t('politica.headerMeta', { count: markets.length, volume: formatVolume(categoryVolume) })}</span>
            ) : showDeportes ? (
              <span className="num">{t('deportes.headerMeta', { count: abiertos, today: hoy, volume: formatVolume(categoryVolume) })}</span>
            ) : (
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
            items={allCategories.map(cat => ({ key: cat, label: cat === 'Todos' ? t('markets.allCategory') : cat }))}
            active={activeCategory}
            onChange={handleCategoryClick}
            style={{ minWidth: 0, flex: 1 }}
          />
          {activeCategory === 'Todos' && (
            <select
              className="input"
              value={sortBy}
              onChange={e => handleSortChange(e.target.value)}
              style={{ height: 36, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 6, flexShrink: 0 }}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {panelAbierto && panelBack}
      {showLanding ? (
        <PoliticaLanding
          markets={markets}
          loading={loading}
          onTraded={patchPrice}
        />
      ) : showDeportes ? (
        <DeportesLanding
          markets={markets}
          loading={loading}
          activeSub={activeSub}
          onSubChange={handleSubChange}
          activeDia={activeDia}
          onDiaChange={handleDiaChange}
        />
      ) : showCrypto ? (
        <CryptoLanding
          markets={markets}
          loading={loading}
          subcats={SUBCATEGORIES['Crypto'] ?? []}
          onTraded={patchPrice}
        />
      ) : showCategoria ? (
        <CategoryLanding
          category={activeCategory as Category}
          markets={markets}
          loading={loading}
          subcats={SUBCATEGORIES[activeCategory as Category] ?? []}
          activeSub={activeSub}
          onSubChange={handleSubChange}
          sort={categoriaSort}
          onSortChange={handleCategoriaSort}
          onTraded={patchPrice}
          feature={panelDisponible(activeCategory, markets, loading) && (
            <PanelCard category={activeCategory as Category} markets={markets} onOpen={() => setPanel(true)} />
          )}
        />
      ) : (
        <>
          {/* Results count */}
          {!loading && (
            <div className="meta-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="num">{t('markets.resultCount', { count: shown.length })}</span>
              {notice && <span>· {notice}</span>}
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
            <MarketGrid markets={[]} onTraded={patchPrice} loading />
          ) : shown.length > 0 ? (
            <MarketGrid markets={shown} onTraded={patchPrice} />
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
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                {t('markets.emptySubtitle')}
              </p>
              {/* Nunca un callejón sin salida: a Tendencia en un toque */}
              <Link to="/" className="btn btn-secondary">{t('markets.emptyCta')}</Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
