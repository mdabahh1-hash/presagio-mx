import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiContenidoCategoria, type ApiPricePoint } from '../../lib/api'
import type { Category, Market } from '../../types'
import { BetBox } from '../BetBox'
import { TradeSheet } from '../TradeSheet'
import { AuthModal } from '../AuthModal'
import { Tabs } from '../Tabs'
import { Icon } from '../Icon'
import { CryptoRow, CryptoExpanded, type Side } from './CryptoRow'
import { EscaleraCard } from './EscaleraCard'
import { RangoCierre } from './RangoCierre'
import { escaleraDe, enVentana, type Ventana } from './escalera'
import { byClosing } from '../../lib/closing'
import { formatVolume } from '../../lib/format'
import { topOutcome } from '../../lib/seatProjection'
import { useMobile } from '../../lib/useMobile'

export const CRYPTO: Category = 'Crypto'
const HISTORY_DAYS = 90
const QUICK_KEY = 'veredikt.compraRapida'
const QUICK_DEFAULT = 500
const MIN_AMOUNT = 10  // espejo de MIN_TRADE_POINTS (BetBox lo valida al operar)

export const CRYPTO_SORTS = ['ending', 'volume', 'movement', 'new'] as const
export type CryptoSort = typeof CRYPTO_SORTS[number]
export const isCryptoSort = (v: string | null | undefined): v is CryptoSort => CRYPTO_SORTS.includes(v as CryptoSort)

interface CryptoLandingProps {
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display
  subcats: string[]
  // Filtros controlados: /mercados los sincroniza con la URL (?sub= ?ventana= ?sort=),
  // la Home los guarda en estado local
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  ventana: Ventana | null
  onVentanaChange: (v: Ventana | null) => void
  // "Todos": limpia ?sub= y ?ventana= en una sola escritura de la URL
  onClear: () => void
  sort: CryptoSort
  onSortChange: (s: CryptoSort) => void
  // Tras operar, la página parchea el precio (y las opciones si es multi)
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
  // h1 + conteo arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
}

// Mercados abiertos, trending primero y luego por volumen (misma regla que Política y Deportes).
export function featuredCandidates(markets: Market[]): Market[] {
  return markets
    .filter(m => m.category === CRYPTO && m.status === 'open')
    .sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return b.volume - a.volume
    })
}

// La landing se monta (Home y /mercados?cat=Crypto) solo con un mercado trending
// abierto; mientras carga se muestra su skeleton. Si no, CategoryBrowse (espejo exacto
// de politicaLandingAvailable y deportesLandingAvailable).
export function cryptoLandingAvailable(markets: Market[], loading: boolean): boolean {
  return loading || featuredCandidates(markets).some(m => m.trending)
}

// Conteos de la cabecera (abiertos · cierran este mes · volumen) sobre la categoría o una subcategoría
export function cryptoResumen(markets: Market[], sub: string | null) {
  const scope = markets.filter(m => m.category === CRYPTO && (!sub || m.subcategory === sub))
  return {
    abiertos: scope.filter(m => m.status === 'open').length,
    esteMes: scope.filter(m => m.status === 'open' && enVentana(m, 'mes')).length,
    volumen: scope.reduce((s, m) => s + m.volume, 0),
  }
}

// Miga «Crypto › Ethereum» sobre el h1 en la vista de subcategoría (3a)
export function CryptoBreadcrumb({ sub, onRoot }: { sub: string; onRoot: () => void }) {
  return (
    <nav aria-label="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 4 }}>
      <button type="button" onClick={onRoot} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-secondary)' }}>{CRYPTO}</button>
      <Icon name="chevron-right" size={12} style={{ color: 'var(--text-tertiary)' }} />
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sub}</span>
    </nav>
  )
}

export function CryptoHeaderMeta({ markets, sub }: { markets: Market[]; sub: string | null }) {
  const { t } = useTranslation()
  const r = cryptoResumen(markets, sub)
  return (
    <span className="num">
      {t('crypto.openCount', { count: r.abiertos })} · {t('crypto.monthCount', { count: r.esteMes })} · {formatVolume(r.volumen)} PT
    </span>
  )
}

function hostOf(url: string): string | null {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return null }
}

function readQuick(): number {
  try {
    const v = Number(localStorage.getItem(QUICK_KEY))
    return Number.isFinite(v) && v >= MIN_AMOUNT ? Math.round(v) : QUICK_DEFAULT
  } catch { return QUICK_DEFAULT }
}

function RailItem({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cat-rail-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '8px 10px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13,
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500, transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <span className="meta-label num">{count}</span>
    </button>
  )
}

// Landing de Crypto (2a) y vista de subcategoría (3a): barra lateral, escalera del mes,
// lista operable (el chip Sí/No expande la fila con gráfica y BetBox) y rango de cierre.
// Cada bloque se monta solo si su dato llegó de la API; nada ilustrativo.
export function CryptoLanding({
  markets, loading, subcats, activeSub, onSubChange, ventana, onVentanaChange, onClear, sort, onSortChange, onTraded, showHeader = false,
}: CryptoLandingProps) {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const inCat = useMemo(() => markets.filter(m => m.category === CRYPTO), [markets])
  const inSub = useMemo(() => (activeSub ? inCat.filter(m => m.subcategory === activeSub) : inCat), [inCat, activeSub])

  // Etiquetas curadas de fuente (contenido_categorias/crypto.py); si no hay, se muestra el host
  const [content, setContent] = useState<ApiContenidoCategoria | null>(null)
  useEffect(() => {
    let alive = true
    contenidoApi.categoria(CRYPTO).then(c => { if (alive) setContent(c) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const sourceOf = useCallback((m: Market): string | null => {
    const host = m.resolutionSourceUrl ? hostOf(m.resolutionSourceUrl) : null
    if (!host) return null
    return content?.fuentes.find(f => f.host === host)?.etiqueta ?? host
  }, [content])

  // Movimiento de 7 días (GET /markets/movers); sin respuesta, la pestaña no se monta
  const [moves, setMoves] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    let alive = true
    marketsApi.movers(168, 50, { category: CRYPTO })
      .then(ms => { if (alive && ms.length) setMoves(Object.fromEntries(ms.map(m => [m.id, Math.abs(m.change)]))) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Compra rápida: preferencia del usuario en localStorage (precarga el monto de BetBox)
  const [quick, setQuick] = useState(readQuick)
  const [editingQuick, setEditingQuick] = useState(false)
  const saveQuick = (v: number) => {
    const n = Math.max(MIN_AMOUNT, Math.round(v) || QUICK_DEFAULT)
    setQuick(n)
    setEditingQuick(false)
    try { localStorage.setItem(QUICK_KEY, String(n)) } catch { /* sin storage: queda en memoria */ }
  }

  // Escalera: la de la subcategoría activa o la primera subcategoría que tenga una
  const escalera = useMemo(() => {
    for (const sub of activeSub ? [activeSub] : subcats) {
      const e = escaleraDe(inCat, sub)
      if (e) return e
    }
    return null
  }, [inCat, subcats, activeSub])
  // Rango de cierre del mismo activo: su multi abierto (el del cierre de la escalera si hay)
  const rangoSub = escalera?.sub ?? activeSub
  const rango = useMemo(() => {
    if (!rangoSub) return null
    const multis = inCat.filter(m => m.subcategory === rangoSub && m.marketType === 'multi' && m.status === 'open' && (m.outcomes?.length ?? 0) > 1).sort(byClosing)
    return multis.find(m => m.endsAt === escalera?.endsAt) ?? multis[0] ?? null
  }, [inCat, rangoSub, escalera])

  // Conteos de la barra lateral y de los filtros (del listado real)
  const counts = useMemo(() => {
    const c = { mes: 0, anio: 0, multi: 0, '7d': 0 } as Record<Ventana, number>
    for (const m of inSub) for (const v of Object.keys(c) as Ventana[]) if (enVentana(m, v)) c[v]++
    return c
  }, [inSub])
  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of inCat) if (m.subcategory) c[m.subcategory] = (c[m.subcategory] ?? 0) + 1
    return c
  }, [inCat])
  // Subcategoría vacía: oculta (mismo criterio que PoliticaTopics, LigasRail y CategoryBrowse)
  const visibleSubs = subcats.filter(s => (subCounts[s] ?? 0) > 0)

  const list = useMemo(() => {
    const items = ventana ? inSub.filter(m => enVentana(m, ventana)) : [...inSub]
    if (sort === 'volume') return items.sort((a, b) => b.volume - a.volume)
    if (sort === 'new') return items.sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
    if (sort === 'movement' && moves) return items.sort((a, b) => (moves[b.id] ?? -1) - (moves[a.id] ?? -1) || byClosing(a, b))
    return items.sort(byClosing)
  }, [inSub, ventana, sort, moves])

  // Fila expandida (una a la vez) y su historial de 90 días, pedido una vez por id
  const [open, setOpen] = useState<{ id: string; where: 'ladder' | 'list'; side: Side } | null>(null)
  const [openOutcome, setOpenOutcome] = useState<string | null>(null)
  const [histories, setHistories] = useState<Record<string, ApiPricePoint[]>>({})
  const requested = useRef(new Set<string>())
  useEffect(() => {
    const id = open?.id
    if (!id || requested.current.has(id)) return
    requested.current.add(id)
    marketsApi.history(id, HISTORY_DAYS)
      .then(h => setHistories(prev => ({ ...prev, [id]: h })))
      .catch(() => setHistories(prev => ({ ...prev, [id]: [] })))
  }, [open?.id])

  // Móvil: el mismo toque abre el TradeSheet con BetBox (patrón de Política y Deportes)
  const [sheet, setSheet] = useState<{ id: string; side: Side } | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeSheet = useCallback(() => setSheet(null), [])
  const sheetMarket = sheet ? inCat.find(m => m.id === sheet.id) ?? null : null

  const onChip = (m: Market, side: Side, where: 'ladder' | 'list') => {
    setOpenOutcome(m.marketType === 'multi' ? topOutcome(m)?.outcome_key ?? null : null)
    if (isMobile) { setSheet({ id: m.id, side }); return }
    setOpen({ id: m.id, where, side })
  }
  const collapse = useCallback(() => setOpen(null), [])
  const requireAuth = () => { setOpen(null); setSheet(null); setAuthOpen(true) }

  const renderExpanded = (id: string) => {
    const m = inCat.find(x => x.id === id)
    if (!m || !open) return null
    return (
      <CryptoExpanded
        market={m}
        history={histories[id]}
        side={open.side}
        amount={quick}
        outcomeKey={openOutcome}
        onOutcome={setOpenOutcome}
        onClose={collapse}
        onRequireAuth={requireAuth}
        onTraded={p => onTraded(m.id, p, m.marketType === 'multi')}
      />
    )
  }

  const header = showHeader && (
    <div className="anim-1" style={{ marginBottom: 24 }}>
      {activeSub && <CryptoBreadcrumb sub={activeSub} onRoot={onClear} />}
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{activeSub ?? CRYPTO}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : <CryptoHeaderMeta markets={markets} sub={activeSub} />}
      </p>
    </div>
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '212px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <div className="cat-rail">
            {[...Array(7)].map((_, i) => <div key={i} className="skeleton" style={{ height: 32, marginBottom: 2 }} />)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="skeleton" style={{ height: 300, marginBottom: 18 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 68, background: 'var(--bg-surface)', border: 'none' }} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pickSub = (sub: string | null) => { setOpen(null); onSubChange(sub) }
  const pickVentana = (v: Ventana | null) => { setOpen(null); onVentanaChange(v) }
  const ventanaLabel: Record<Ventana, string> = {
    mes: t('crypto.thisMonth'), anio: t('crypto.yearEnd'), multi: t('crypto.multi'), '7d': t('crypto.closes7d'),
  }
  const filtros = (['mes', 'anio', 'multi', '7d'] as Ventana[]).filter(v => counts[v] > 0 || v === ventana)
  const sortItems = CRYPTO_SORTS
    .filter(s => s !== 'movement' || moves)
    .map(s => ({ key: s, label: t(`crypto.sort_${s}` as const) }))

  return (
    <div style={{ marginBottom: 48 }}>
      {header}
      <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '212px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* Barra lateral: ?sub= y ventanas de cierre; en móvil .cat-rail es una fila con scroll */}
        <nav className="cat-rail anim-1" aria-label={CRYPTO}>
          <div className="meta-label cat-rail-header" style={{ marginBottom: 8, padding: '0 10px' }}>{CRYPTO}</div>
          <RailItem active={!activeSub && !ventana} label={t('crypto.all')} count={inCat.length} onClick={() => { setOpen(null); onClear() }} />
          {counts.mes > 0 && <RailItem active={ventana === 'mes'} label={t('crypto.thisMonth')} count={counts.mes} onClick={() => pickVentana(ventana === 'mes' ? null : 'mes')} />}
          {visibleSubs.map(s => (
            <RailItem key={s} active={activeSub === s} label={s} count={subCounts[s] ?? 0} onClick={() => pickSub(activeSub === s ? null : s)} />
          ))}
          {counts.anio > 0 && <RailItem active={ventana === 'anio'} label={t('crypto.yearEnd')} count={counts.anio} onClick={() => pickVentana(ventana === 'anio' ? null : 'anio')} />}
          <div className="cat-rail-divider" style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}>
            <span className="meta-label">{t('crypto.quickBuy')}</span>
            {editingQuick ? (
              <input
                className="input num"
                type="number"
                min={MIN_AMOUNT}
                defaultValue={quick}
                autoFocus
                aria-label={t('crypto.quickBuy')}
                onBlur={e => saveQuick(Number(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') saveQuick(Number((e.target as HTMLInputElement).value)) }}
                style={{ width: 80, height: 28, fontSize: 12, padding: '0 8px' }}
              />
            ) : (
              <>
                <span className="badge badge-accent num">{quick.toLocaleString('en-US')} PT</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ height: 24, padding: '0 6px', fontSize: 12 }} onClick={() => setEditingQuick(true)}>
                  {t('crypto.change')}
                </button>
              </>
            )}
          </div>
        </nav>

        <div style={{ minWidth: 0 }}>
          <div className="anim-1" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Tabs<CryptoSort> size="sm" items={sortItems} active={sort} onChange={onSortChange} ariaLabel={t('crypto.sortLabel')} />
          </div>

          {escalera && (
            <EscaleraCard
              className="anim-2"
              escalera={escalera}
              source={sourceOf(escalera.peldanos[0].market)}
              expandedId={open?.where === 'ladder' ? open.id : null}
              onChip={(id, side) => { const m = inCat.find(x => x.id === id); if (m) onChip(m, side, 'ladder') }}
              onCollapse={collapse}
              renderExpanded={renderExpanded}
            />
          )}

          {filtros.length > 0 && (
            <div className="anim-3" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <button type="button" className={`btn btn-sm ${ventana ? 'btn-ghost' : 'btn-secondary'}`} onClick={() => pickVentana(null)}>{t('crypto.all')}</button>
              {filtros.map(v => (
                <button key={v} type="button" className={`btn btn-sm ${ventana === v ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => pickVentana(ventana === v ? null : v)}>
                  {ventanaLabel[v]}
                </button>
              ))}
            </div>
          )}

          <div className="anim-3">
            {list.length > 0 ? list.map(m => (
              <React.Fragment key={m.id}>
                <CryptoRow
                  market={m}
                  expanded={open?.where === 'list' && open.id === m.id}
                  hideSub={!!activeSub}
                  source={sourceOf(m)}
                  onChip={side => onChip(m, side, 'list')}
                  onCollapse={collapse}
                />
                {open?.where === 'list' && open.id === m.id && renderExpanded(m.id)}
              </React.Fragment>
            )) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                  {inSub.length === 0 && activeSub ? t('crypto.emptySub', { sub: activeSub }) : t('crypto.emptyFilter')}
                </p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(null); onClear() }}>{t('crypto.viewAll')}</button>
              </div>
            )}
          </div>

          {rango && rangoSub && <RangoCierre className="anim-4" market={rango} sub={rangoSub} />}
        </div>
      </div>

      <TradeSheet open={!!sheetMarket} onClose={closeSheet}>
        {sheetMarket && sheet && (
          <BetBox
            key={`${sheetMarket.id}-${sheet.side}`}
            marketId={sheetMarket.id}
            yesPrice={sheetMarket.yesPrice}
            marketType={sheetMarket.marketType === 'multi' ? 'multi' : 'binary'}
            outcomes={sheetMarket.outcomes ?? []}
            selectedOutcomeKey={openOutcome}
            onOutcomeSelect={setOpenOutcome}
            subcategory={sheetMarket.subcategory}
            initialSide={sheet.side}
            initialAmount={quick}
            compact
            onRequireAuth={requireAuth}
            onTraded={p => onTraded(sheetMarket.id, p, sheetMarket.marketType === 'multi')}
          />
        )}
      </TradeSheet>
      {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
