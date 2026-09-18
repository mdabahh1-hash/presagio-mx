import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, Market } from '../../types'
import { MarketCard } from '../MarketCard'
import { BetBox } from '../BetBox'
import { TradeSheet } from '../TradeSheet'
import { AuthModal } from '../AuthModal'
import { byClosing } from '../../lib/closing'
import { formatVolume } from '../../lib/format'

export const ECONOMIA: Category = 'Economía'
const PAGE = 12

export const ECONOMIA_SORTS = ['all', 'pending', 'ending', 'volume'] as const
export type EconomiaSort = typeof ECONOMIA_SORTS[number]
export const isEconomiaSort = (v: string | null | undefined): v is EconomiaSort => ECONOMIA_SORTS.includes(v as EconomiaSort)

interface EconomiaLandingProps {
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display; las vacías se ocultan
  subcats: string[]
  // Filtros controlados: /mercados los sincroniza con la URL (?sub= ?sort=), la Home
  // los guarda en estado local
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  sort: EconomiaSort
  onSortChange: (s: EconomiaSort) => void
  // Tras operar, la página parchea el precio (y recarga las opciones si es multi)
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
  // h1 + meta arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
}

// Mercados abiertos, trending primero y luego por volumen (misma regla que Política,
// Deportes y Crypto).
export function featuredCandidates(markets: Market[]): Market[] {
  return markets
    .filter(m => m.category === ECONOMIA && m.status === 'open')
    .sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return b.volume - a.volume
    })
}

// La landing se monta solo con un mercado trending abierto; mientras carga, su
// skeleton. Si no, CategoryBrowse (espejo de politicaLandingAvailable).
export function economiaLandingAvailable(markets: Market[], loading: boolean): boolean {
  return loading || featuredCandidates(markets).some(m => m.trending)
}

function inScope(markets: Market[], sub: string | null): Market[] {
  return markets.filter(m => m.category === ECONOMIA && (!sub || m.subcategory === sub))
}

// Miga «Economía / Tasas Banxico» sobre el h1 en la vista de subcategoría
export function EconomiaBreadcrumb({ sub, onRoot }: { sub: string; onRoot: () => void }) {
  return (
    <nav aria-label="breadcrumb" className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <button type="button" onClick={onRoot} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--text-tertiary)' }}>{ECONOMIA}</button>
      <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>/</span>
      <span style={{ color: 'var(--text-secondary)' }}>{sub}</span>
    </nav>
  )
}

// «N mercados · X PT de volumen» de la categoría o de la subcategoría activa
export function EconomiaHeaderMeta({ markets, sub }: { markets: Market[]; sub: string | null }) {
  const { t } = useTranslation()
  const scope = inScope(markets, sub)
  const volume = scope.reduce((s, m) => s + m.volume, 0)
  return <span className="num">{t('economia.headerMeta', { count: scope.length, volume: formatVolume(volume) })}</span>
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

function sortMarkets(items: Market[], sort: EconomiaSort): Market[] {
  const list = [...items]
  if (sort === 'volume') return list.sort((a, b) => b.volume - a.volume)
  if (sort === 'ending') return list.sort(byClosing)
  if (sort === 'pending') {
    const pend = (m: Market) => (m.status === 'pending_resolution' ? 0 : 1)
    return list.sort((a, b) => pend(a) - pend(b) || byClosing(a, b))
  }
  return list.sort((a, b) => (a.trending !== b.trending ? (a.trending ? -1 : 1) : b.volume - a.volume))
}

// Landing de Economía (handoff S1–S3): barra lateral de subcategorías con conteos y
// grid de tarjetas con compra rápida Sí/No por opción. Solo pinta lo que trae la API.
export function EconomiaLanding({
  markets, loading, subcats, activeSub, onSubChange, sort, onSortChange, onTraded, showHeader = false,
}: EconomiaLandingProps) {
  const { t } = useTranslation()
  const inCat = useMemo(() => inScope(markets, null), [markets])
  const list = useMemo(() => sortMarkets(activeSub ? inCat.filter(m => m.subcategory === activeSub) : inCat, sort), [inCat, activeSub, sort])

  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of inCat) if (m.subcategory) c[m.subcategory] = (c[m.subcategory] ?? 0) + 1
    return c
  }, [inCat])
  // Subcategoría vacía: oculta (mismo criterio que CategoryBrowse y Crypto)
  const visibleSubs = subcats.filter(s => (subCounts[s] ?? 0) > 0)

  const [shown, setShown] = useState(PAGE)
  const [trade, setTrade] = useState<{ marketId: string; side: 'YES' | 'NO'; outcomeKey?: string } | null>(null)
  const [tradeOutcome, setTradeOutcome] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeTrade = useCallback(() => setTrade(null), [])
  const tradeMarket = trade ? inCat.find(m => m.id === trade.marketId) ?? null : null

  const pickSub = (sub: string | null) => { setShown(PAGE); onSubChange(sub) }
  const openTrade = (m: Market, side: 'YES' | 'NO', outcomeKey?: string) => {
    setTradeOutcome(outcomeKey ?? null)
    setTrade({ marketId: m.id, side, outcomeKey })
  }

  const header = showHeader && (
    <div className="anim-1" style={{ marginBottom: 24 }}>
      {activeSub && <EconomiaBreadcrumb sub={activeSub} onRoot={() => pickSub(null)} />}
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{activeSub ?? ECONOMIA}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : <EconomiaHeaderMeta markets={markets} sub={activeSub} />}
      </p>
    </div>
  )

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 } as const

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="cat-browse economia-browse" style={{ display: 'grid', gridTemplateColumns: '224px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div className="cat-rail">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 2 }} />)}
          </div>
          <div style={grid}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        </div>
      </div>
    )
  }

  const sortLabel: Record<EconomiaSort, string> = {
    all: t('economia.sortAll'), pending: t('economia.sortPending'), ending: t('economia.sortEndingSoon'), volume: t('economia.sortVolume'),
  }
  const rest = list.length - shown

  return (
    <div style={{ marginBottom: 48 }}>
      {header}
      <div className="cat-browse economia-browse" style={{ display: 'grid', gridTemplateColumns: '224px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
        {/* Barra lateral: ?sub=; por debajo de 1024 px es una fila de chips con scroll */}
        <nav className="cat-rail anim-1" aria-label={ECONOMIA}>
          <RailItem active={!activeSub} label={t('economia.all')} count={inCat.length} onClick={() => pickSub(null)} />
          {visibleSubs.map(s => (
            <RailItem key={s} active={activeSub === s} label={s} count={subCounts[s] ?? 0} onClick={() => pickSub(activeSub === s ? null : s)} />
          ))}
        </nav>

        <div style={{ minWidth: 0 }}>
          <div className="anim-1" role="group" aria-label={t('economia.sortLabel')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {ECONOMIA_SORTS.map(s => (
              <button key={s} type="button" aria-pressed={sort === s} className={`btn btn-sm ${sort === s ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => { setShown(PAGE); onSortChange(s) }}>
                {sortLabel[s]}
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <div className="anim-2" style={grid}>
              {list.slice(0, shown).map(m => (
                <MarketCard
                  key={m.id}
                  market={m}
                  quickLayout="chips"
                  onQuickTrade={(side, outcomeKey) => openTrade(m, side, outcomeKey)}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{t('economia.emptySub', { sub: activeSub ?? ECONOMIA })}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => pickSub(null)}>{t('economia.viewAll')}</button>
            </div>
          )}

          {rest > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShown(n => n + PAGE)}>
                {t('economia.showMore', { count: rest })}
              </button>
            </div>
          )}
        </div>
      </div>

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
            onTraded={p => onTraded(tradeMarket.id, p, tradeMarket.marketType === 'multi')}
          />
        )}
      </TradeSheet>
      {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
