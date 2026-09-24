import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiContenidoCategoria, type ApiPricePoint, type ApiResumenCategoria } from '../../lib/api'
import type { Category, Market } from '../../types'
import { QuickTradeSheet } from '../QuickTradeSheet'
import { AuthModal } from '../AuthModal'
import { Tabs } from '../Tabs'
import { CryptoExpanded, type Side } from './CryptoExpanded'
import { EscaleraCard } from './EscaleraCard'
import { RangoCierre } from './RangoCierre'
import { CurvaImplicita } from './CurvaImplicita'
import { escaleraDe, enVentana } from './escalera'
import { OpcionesChart } from '../panel/OpcionesChart'
import { MoversCard } from '../panel/MoversCard'
import { VolumenTemas } from '../panel/VolumenTemas'
import { byClosing } from '../../lib/closing'
import { formatVolume } from '../../lib/format'
import { topOutcome } from '../../lib/seatProjection'
import { useMobile } from '../../lib/useMobile'

export const CRYPTO: Category = 'Crypto'
const HISTORY_DAYS = 90
// Monto con el que abre la compra desde la escalera (el BetBox lo deja cambiar)
const QUICK_AMOUNT = 500

interface CryptoLandingProps {
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display: orden de las pestañas de activo
  subcats: string[]
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

// Panel de Crypto (se abre desde la tarjeta panel del grid): pestañas por activo con
// escalera del mes, curva de precio implícito y rango de cierre; luego las opciones del
// rango en el tiempo, los que más se movieron y el volumen por tema. Sin lista de
// mercados (está en el grid). Cada bloque se monta solo si su dato llegó de la API.
export function CryptoLanding({ markets, loading, subcats, onTraded, showHeader = false }: CryptoLandingProps) {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const inCat = useMemo(() => markets.filter(m => m.category === CRYPTO), [markets])

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

  const [resumen, setResumen] = useState<ApiResumenCategoria | null>(null)
  useEffect(() => {
    let alive = true
    marketsApi.resumen(CRYPTO).then(r => { if (alive) setResumen(r) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Una pestaña por activo con escalera (BTC, ETH, SOL, stablecoins…), en el orden de categories.ts
  const escaleras = useMemo(() => subcats.flatMap(sub => escaleraDe(inCat, sub) ?? []), [inCat, subcats])
  const [activo, setActivo] = useState<string | null>(null)
  const escalera = escaleras.find(e => e.sub === activo) ?? escaleras[0] ?? null
  // Rango de cierre del mismo activo: su multi abierto (el del cierre de la escalera si hay)
  const rango = useMemo(() => {
    if (!escalera) return null
    const multis = inCat.filter(m => m.subcategory === escalera.sub && m.marketType === 'multi' && m.status === 'open' && (m.outcomes?.length ?? 0) > 1).sort(byClosing)
    return multis.find(m => m.endsAt === escalera.endsAt) ?? multis[0] ?? null
  }, [inCat, escalera])

  // Peldaño expandido (uno a la vez) y su historial de 90 días, pedido una vez por id
  const [open, setOpen] = useState<{ id: string; side: Side } | null>(null)
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

  const onChip = (m: Market, side: Side) => {
    setOpenOutcome(m.marketType === 'multi' ? topOutcome(m)?.outcome_key ?? null : null)
    if (isMobile) { setSheet({ id: m.id, side }); return }
    setOpen({ id: m.id, side })
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
        amount={QUICK_AMOUNT}
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
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{CRYPTO}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : <CryptoHeaderMeta markets={markets} sub={null} />}
      </p>
    </div>
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="pol-cards">
          <div className="skeleton" style={{ height: 300 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 48 }}>
      {header}
      {escalera && (
        <>
          {escaleras.length > 1 && (
            <div className="anim-1" style={{ marginBottom: 16 }}>
              <Tabs<string>
                items={escaleras.map(e => ({ key: e.sub, label: e.sub }))}
                active={escalera.sub}
                onChange={sub => { setOpen(null); setActivo(sub) }}
                ariaLabel={CRYPTO}
              />
            </div>
          )}
          <div className="pol-cards anim-2" style={{ marginBottom: 18 }}>
            <CurvaImplicita escalera={escalera} />
            {rango && <RangoCierre market={rango} sub={escalera.sub} />}
          </div>
          <EscaleraCard
            className="anim-3"
            escalera={escalera}
            source={sourceOf(escalera.peldanos[0].market)}
            expandedId={open?.id ?? null}
            onChip={(id, side) => { const m = inCat.find(x => x.id === id); if (m) onChip(m, side) }}
            onCollapse={collapse}
            renderExpanded={renderExpanded}
          />
        </>
      )}

      {rango && <div className="anim-3" style={{ marginBottom: 18 }}><OpcionesChart market={rango} title={t('panel.rangoTiempo', { sub: escalera?.sub ?? '' })} /></div>}

      <div className="pol-cards anim-4">
        <MoversCard category={CRYPTO} />
        {resumen && <VolumenTemas resumen={resumen} title={t('panel.volumenTema')} />}
      </div>

      {/* Móvil: la hoja comparte la opción con el peldaño */}
      <QuickTradeSheet
        market={sheetMarket}
        side={sheet?.side ?? 'YES'}
        betKey={`${sheet?.id}-${sheet?.side}`}
        outcomeKey={openOutcome}
        onOutcomeChange={setOpenOutcome}
        initialAmount={QUICK_AMOUNT}
        onClose={closeSheet}
        onTraded={p => sheetMarket && onTraded(sheetMarket.id, p, sheetMarket.marketType === 'multi')}
      />
      {/* Escritorio: el acceso del peldaño expandido (CryptoExpanded) sigue en modal */}
      {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
