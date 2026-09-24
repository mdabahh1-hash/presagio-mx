import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Category, Market } from '../../types'
import { MarketGrid } from '../MarketGrid'
import { byClosing } from '../../lib/closing'
import { formatVolume } from '../../lib/format'

const PAGE = 12

export const CATEGORY_SORTS = ['all', 'pending', 'ending', 'volume'] as const
export type CategorySort = typeof CATEGORY_SORTS[number]
export const isCategorySort = (v: string | null | undefined): v is CategorySort => CATEGORY_SORTS.includes(v as CategorySort)

interface CategoryLandingProps {
  // Categoría que se pinta (identificador de API; no se traduce)
  category: Category
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display; las vacías se ocultan
  subcats: string[]
  // Filtros controlados: /mercados los sincroniza con la URL (?sub= ?sort=), la Home
  // los guarda en estado local
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  sort: CategorySort
  onSortChange: (s: CategorySort) => void
  // Tras operar, la página parchea el precio (y recarga las opciones si es multi)
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
  // h1 + meta arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
  // Primera celda del grid en «Todos» (PanelCard de las categorías con landing propia)
  feature?: ReactNode
}

function inScope(markets: Market[], category: Category, sub: string | null): Market[] {
  return markets.filter(m => m.category === category && (!sub || m.subcategory === sub))
}

// Miga «Economía / Tasas Banxico» sobre el h1 en la vista de subcategoría
export function CategoryBreadcrumb({ category, sub, onRoot }: { category: Category; sub: string; onRoot: () => void }) {
  return (
    <nav aria-label="breadcrumb" className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <button type="button" onClick={onRoot} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--text-tertiary)' }}>{category}</button>
      <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>/</span>
      <span style={{ color: 'var(--text-secondary)' }}>{sub}</span>
    </nav>
  )
}

// «N mercados · X PT de volumen» de la categoría o de la subcategoría activa
export function CategoryHeaderMeta({ category, markets, sub }: { category: Category; markets: Market[]; sub: string | null }) {
  const { t } = useTranslation()
  const scope = inScope(markets, category, sub)
  const volume = scope.reduce((s, m) => s + m.volume, 0)
  return <span className="num">{t('categoria.headerMeta', { count: scope.length, volume: formatVolume(volume) })}</span>
}

function RailItem({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="cat-rail-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '10px 12px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 14,
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500, transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>{count}</span>
    </button>
  )
}

function sortMarkets(items: Market[], sort: CategorySort): Market[] {
  const list = [...items]
  if (sort === 'volume') return list.sort((a, b) => b.volume - a.volume)
  if (sort === 'ending') return list.sort(byClosing)
  if (sort === 'pending') {
    const pend = (m: Market) => (m.status === 'pending_resolution' ? 0 : 1)
    return list.sort((a, b) => pend(a) - pend(b) || byClosing(a, b))
  }
  return list.sort((a, b) => (a.trending !== b.trending ? (a.trending ? -1 : 1) : b.volume - a.volume))
}

// Landing genérica de categoría (nació como la de Economía, handoff S1–S3): barra
// lateral de subcategorías con conteos y grid de tarjetas con compra rápida Sí/No
// por opción. Es el diseño por defecto de toda categoría salvo LANDINGS_PROPIAS
// (Deportes, Política, Crypto). Se monta siempre; solo pinta lo que trae la API.
export function CategoryLanding({
  category, markets, loading, subcats, activeSub, onSubChange, sort, onSortChange, onTraded, showHeader = false, feature,
}: CategoryLandingProps) {
  const { t } = useTranslation()
  const inCat = useMemo(() => inScope(markets, category, null), [markets, category])
  const list = useMemo(() => sortMarkets(activeSub ? inCat.filter(m => m.subcategory === activeSub) : inCat, sort), [inCat, activeSub, sort])

  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of inCat) if (m.subcategory) c[m.subcategory] = (c[m.subcategory] ?? 0) + 1
    return c
  }, [inCat])
  // Subcategoría vacía: oculta (mismo criterio que CategoryBrowse y Crypto)
  const visibleSubs = subcats.filter(s => (subCounts[s] ?? 0) > 0)

  const [shown, setShown] = useState(PAGE)

  const pickSub = (sub: string | null) => { setShown(PAGE); onSubChange(sub) }

  const header = showHeader && (
    <div className="anim-1" style={{ marginBottom: 24 }}>
      {activeSub && <CategoryBreadcrumb category={category} sub={activeSub} onRoot={() => pickSub(null)} />}
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{activeSub ?? category}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : <CategoryHeaderMeta category={category} markets={markets} sub={activeSub} />}
      </p>
    </div>
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="cat-browse categoria-browse" style={{ display: 'grid', gridTemplateColumns: '224px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div className="cat-rail">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 2 }} />)}
          </div>
          <MarketGrid markets={[]} onTraded={onTraded} loading />
        </div>
      </div>
    )
  }

  const sortLabel: Record<CategorySort, string> = {
    all: t('categoria.sortAll'), pending: t('categoria.sortPending'), ending: t('categoria.sortEndingSoon'), volume: t('categoria.sortVolume'),
  }
  const rest = list.length - shown

  return (
    <div style={{ marginBottom: 48 }}>
      {header}
      <div className="cat-browse categoria-browse" style={{ display: 'grid', gridTemplateColumns: '224px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
        {/* Barra lateral: ?sub=; por debajo de 1024 px es una fila de chips con scroll */}
        <nav className="cat-rail anim-1" aria-label={category}>
          <RailItem active={!activeSub} label={t('categoria.all')} count={inCat.length} onClick={() => pickSub(null)} />
          {visibleSubs.map(s => (
            <RailItem key={s} active={activeSub === s} label={s} count={subCounts[s] ?? 0} onClick={() => pickSub(activeSub === s ? null : s)} />
          ))}
        </nav>

        <div style={{ minWidth: 0 }}>
          <div className="anim-1" role="group" aria-label={t('categoria.sortLabel')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORY_SORTS.map(s => (
              <button key={s} type="button" aria-pressed={sort === s} className={`btn btn-sm ${sort === s ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => { setShown(PAGE); onSortChange(s) }}>
                {sortLabel[s]}
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <MarketGrid markets={list.slice(0, shown)} onTraded={onTraded} lead={activeSub ? null : feature} />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{t('categoria.emptySub', { sub: activeSub ?? category })}</p>
              {/* Con subcategoría, «Ver todos» vuelve a la categoría; sin ella (categoría
                  vacía) no habría nada que limpiar, así que lleva a todos los mercados */}
              {activeSub
                ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickSub(null)}>{t('categoria.viewAll')}</button>
                : <Link to="/mercados" className="btn btn-ghost btn-sm">{t('categoria.viewAll')}</Link>}
            </div>
          )}

          {rest > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShown(n => n + PAGE)}>
                {t('categoria.showMore', { count: rest })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
