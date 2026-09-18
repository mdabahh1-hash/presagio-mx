import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiContenidoCategoria, type ApiPricePoint, type ApiResumenCategoria } from '../../lib/api'
import type { Category, Market } from '../../types'
import type { MultiSeries } from '../SparkChart'
import { BetBox } from '../BetBox'
import { TradeSheet } from '../TradeSheet'
import { AuthModal } from '../AuthModal'
import { LigasRail, type LigaCard } from './LigasRail'
import { DeportesHero } from './DeportesHero'
import { VolumenLigas } from './VolumenLigas'
import { Jornada } from './Jornada'
import { TituloTable } from './TituloTable'
import { AccesoriosCard } from './AccesoriosCard'
import { FiltrosPopover } from './FiltrosPopover'
import { LigaView } from './LigaView'
import { SPORT_GROUPS, sportOfSub, type Kind } from '../../lib/categories'
import { byClosing } from '../../lib/closing'
import { formatVolume } from '../../lib/format'
import { filterRange, splitHistory, type ChartRange } from '../../lib/chartRange'
import { deltaSince, DAY_MS } from '../../lib/priceDelta'
import { diaKeyOf } from '../../lib/jornada'
import { topOutcome } from '../../lib/seatProjection'
import { useEnVivo } from '../../lib/useEnVivo'

interface DeportesLandingProps {
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display
  subcats: string[]
  // Filtros controlados: /mercados los sincroniza con la URL (?sub= ?sport= ?kind= ?dia=),
  // la Home los guarda en estado local (Mark no quiere salir de la portada)
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  activeSport: string | null
  onSportChange: (sport: string | null) => void
  activeKind: Kind | null
  onKindChange: (kind: Kind | null) => void
  activeDia: string | null
  onDiaChange: (dia: string | null) => void
  // Tras operar en el sheet, la página parchea el precio (y las opciones si es multi)
  onTraded: (marketId: string, newYesPrice: number, isMulti: boolean) => void
  // h1 + conteo arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
}

export const DEPORTES: Category = 'Deportes'
const HISTORY_DAYS = 90

// Mercados abiertos, trending primero y luego por volumen (misma regla que Política y FeaturedCarousel).
export function featuredCandidates(markets: Market[]): Market[] {
  return markets
    .filter(m => m.category === DEPORTES && m.status === 'open')
    .sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return b.volume - a.volume
    })
}

// La landing se monta (Home y /mercados?cat=Deportes) solo con un mercado trending
// abierto; mientras carga se muestra su skeleton. Si no, CategoryBrowse (espejo exacto
// de politicaLandingAvailable).
export function deportesLandingAvailable(markets: Market[], loading: boolean): boolean {
  return loading || featuredCandidates(markets).some(m => m.trending)
}

function hostOf(url: string): string | null {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return null }
}

// Landing de Deportes (píldora de la Home y /mercados?cat=Deportes): riel de ligas,
// destacado con compra en sitio, volumen por liga, jornada por día, tabla de título y
// accesorios. Cada bloque se monta solo si su dato llegó de la API; nada ilustrativo.
export function DeportesLanding({
  markets, loading, activeSub, onSubChange, activeSport, onSportChange,
  activeKind, onKindChange, activeDia, onDiaChange, onTraded, showHeader = false,
}: DeportesLandingProps) {
  const { t } = useTranslation()
  const inCat = useMemo(() => markets.filter(m => m.category === DEPORTES), [markets])
  // Una liga implica su deporte (deep links viejos ?sub=Liga MX siguen funcionando)
  const sport = activeSport ?? (activeSub ? sportOfSub(activeSub) ?? null : null)
  const sportLeagues = useMemo(() => (sport ? SPORT_GROUPS[sport] ?? [sport] : null), [sport])
  const inScope = useMemo(
    () => inCat.filter(m =>
      (!activeSub || m.subcategory === activeSub)
      && (!sportLeagues || (!!m.subcategory && sportLeagues.includes(m.subcategory)))
      && (!activeKind || m.kind === activeKind)),
    [inCat, activeSub, sportLeagues, activeKind],
  )
  const hasFilters = !!(activeSub || sport || activeKind)
  const clearFilters = useCallback(() => {
    onSubChange(null); onSportChange(null); onKindChange(null); onDiaChange(null)
  }, [onSubChange, onSportChange, onKindChange, onDiaChange])

  // Destacado: del alcance filtrado; si el filtro no deja ninguno abierto, de toda la categoría
  const featured = useMemo(
    () => featuredCandidates(inScope)[0] ?? featuredCandidates(inCat)[0] ?? null,
    [inScope, inCat],
  )

  // Marcador en vivo de los partidos en ventana (poll de 1 min; {} si no hay o el poller está apagado)
  const live = useEnVivo(inCat)

  // Agregados (riel de ligas y volumen por liga); sin respuesta, esos bloques no se montan
  const [resumen, setResumen] = useState<ApiResumenCategoria | null>(null)
  useEffect(() => {
    let alive = true
    marketsApi.resumen(DEPORTES).then(r => { if (alive) setResumen(r) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Contenido curado (contenido_categorias/deportes.py): mercado de campeón por liga y etiquetas de fuente
  const [content, setContent] = useState<ApiContenidoCategoria | null>(null)
  useEffect(() => {
    let alive = true
    contenidoApi.categoria(DEPORTES).then(c => { if (alive) setContent(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Historial de 90 días del destacado, una vez por id
  const [histories, setHistories] = useState<Record<string, ApiPricePoint[]>>({})
  const requested = useRef(new Set<string>())
  useEffect(() => {
    const id = featured?.id
    if (!id || requested.current.has(id)) return
    requested.current.add(id)
    marketsApi.history(id, HISTORY_DAYS)
      .then(h => setHistories(prev => ({ ...prev, [id]: h })))
      .catch(() => setHistories(prev => ({ ...prev, [id]: [] })))
  }, [featured?.id])

  const [range, setRange] = useState<ChartRange>('all')
  const featuredHist = featured ? histories[featured.id] : undefined
  const historyLoading = !!featured && featuredHist === undefined

  // Serie(s) de la gráfica: el Sí (binario) o las 3 opciones líderes (multi), en el rango elegido
  const { series, delta } = useMemo<{ series: MultiSeries[]; delta: number | null }>(() => {
    if (!featured || !featuredHist) return { series: [], delta: null }
    const { binary, byOutcome } = splitHistory(featuredHist)
    if (featured.marketType === 'multi') {
      const top = [...(featured.outcomes ?? [])].sort((a, b) => b.price - a.price).slice(0, 3)
      const lider = top[0]
      return {
        series: top.map((o, i) => ({ outcome_key: o.outcome_key, label: o.label, data: filterRange(byOutcome[o.outcome_key] ?? [], range), color: `var(--chart-${i + 1})` })),
        delta: lider ? deltaSince(byOutcome[lider.outcome_key] ?? [], DAY_MS) : null,
      }
    }
    return {
      series: [{ outcome_key: 'yes', label: t('common.yes'), data: filterRange(binary, range), color: 'var(--chart-1)' }],
      delta: deltaSince(binary, DAY_MS),
    }
  }, [featured, featuredHist, range, t])

  // Riel: todas las ligas con mercados abiertos, por volumen acumulado (GET /markets/resumen)
  const ligas = useMemo<LigaCard[]>(
    () => (resumen?.subcategorias ?? []).filter(s => s.abiertos > 0).map(s => ({ sub: s.subcategory, abiertos: s.abiertos, volumen: s.volumen_total })),
    [resumen],
  )

  // Tabla de título: la liga activa o la primera del riel con multi de campeón cargado
  const titulos = content?.titulos ?? {}
  const tituloLiga = useMemo(() => {
    const candidatas = activeSub ? [activeSub] : sportLeagues ?? ligas.map(l => l.sub)
    return candidatas.find(l => titulos[l] && inCat.some(m => m.id === titulos[l] && m.marketType === 'multi')) ?? null
  }, [activeSub, sportLeagues, ligas, titulos, inCat])
  const tituloMarket = tituloLiga ? inCat.find(m => m.id === titulos[tituloLiga]) ?? null : null

  // Accesorios de jugador: binarios kind: accesorio abiertos en el alcance, por cierre
  const accesorios = useMemo(
    () => inScope.filter(m => m.kind === 'accesorio' && m.marketType !== 'multi' && m.status === 'open').sort(byClosing),
    [inScope],
  )

  // Tercer dato de la fila: fuente de resolución en corto (etiqueta curada o el host)
  const extraMetaOf = useCallback((m: Market): string | null => {
    const host = m.resolutionSourceUrl ? hostOf(m.resolutionSourceUrl) : null
    if (!host) return null
    return content?.fuentes.find(f => f.host === host)?.etiqueta ?? host
  }, [content])

  // Compra en sitio (patrón de Política): el sheet lee el mercado vivo por id
  const [trade, setTrade] = useState<{ marketId: string } | null>(null)
  const [tradeOutcome, setTradeOutcome] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeTrade = useCallback(() => setTrade(null), [])
  const tradeMarket = trade ? inCat.find(m => m.id === trade.marketId) ?? null : null
  const openTrade = (m: Market) => {
    setTradeOutcome(m.marketType === 'multi' ? topOutcome(m)?.outcome_key ?? null : null)
    setTrade({ marketId: m.id })
  }

  const abiertos = inCat.filter(m => m.status === 'open').length
  const hoy = inCat.filter(m => diaKeyOf(m) === 'hoy').length
  const header = showHeader && (
    <div className="anim-1" style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{DEPORTES}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : (
          <span className="num">{t('deportes.headerMeta', { count: abiertos, today: hoy, volume: formatVolume(inCat.reduce((s, m) => s + m.volume, 0)) })}</span>
        )}
      </p>
    </div>
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="skeleton" style={{ height: 22, width: 120, marginBottom: 12 }} />
        <div className="ligas-rail" style={{ marginBottom: 22 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ flex: '0 0 auto', width: 178, height: 96 }} />)}
        </div>
        <div className="dep-hero">
          <div className="skeleton" style={{ height: 360 }} />
          <div className="skeleton" style={{ height: 360 }} />
        </div>
        <div className="skeleton" style={{ height: 48, marginBottom: 12, background: 'var(--bg-surface)', border: 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 70, background: 'var(--bg-surface)', border: 'none' }} />)}
        </div>
      </div>
    )
  }

  if (!featured) return null
  const singleCard = !!tituloMarket !== accesorios.length > 0
  const filtros = (
    <FiltrosPopover markets={inCat} sport={sport} sub={activeSub} kind={activeKind} onSport={onSportChange} onSub={onSubChange} onKind={onKindChange} />
  )

  return (
    <div style={{ marginBottom: 48 }}>
      {header}

      <div className="anim-1" style={{ marginBottom: 22 }}>
        {ligas.length > 0 ? (
          <LigasRail
            ligas={ligas}
            active={activeSub}
            onSelect={sub => { if (sub) onSubChange(sub); else { onSubChange(null); onSportChange(null) } }}
            extra={filtros}
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{filtros}</div>
        )}
      </div>

      {activeSub ? (
        /* Nivel 2: vista de liga (cabecera, tabs de tipo, jornada y columna derecha) */
        <LigaView
          className="anim-2"
          liga={activeSub}
          sport={sport}
          markets={inCat.filter(m => m.subcategory === activeSub)}
          resumen={resumen?.subcategorias.find(s => s.subcategory === activeSub) ?? null}
          tituloMarket={tituloMarket}
          activeKind={activeKind}
          onKindChange={onKindChange}
          activeDia={activeDia}
          onDiaChange={onDiaChange}
          extraMetaOf={extraMetaOf}
          onClear={clearFilters}
          live={live}
        />
      ) : (
        <>
          <div className="dep-hero anim-2">
            <DeportesHero
              market={featured}
              series={series}
              historyLoading={historyLoading}
              delta={delta}
              range={range}
              onRange={setRange}
              onTrade={() => openTrade(featured)}
            />
            {resumen && <VolumenLigas resumen={resumen} />}
          </div>

          <Jornada
            className="anim-3"
            markets={inScope}
            activeDia={activeDia}
            onDiaChange={onDiaChange}
            extraMetaOf={extraMetaOf}
            live={live}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
          />

          {(tituloMarket || accesorios.length > 0) && (
            <div className="dep-cards anim-4" style={singleCard ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
              {tituloMarket && tituloLiga && <TituloTable market={tituloMarket} liga={tituloLiga} />}
              {accesorios.length > 0 && <AccesoriosCard markets={accesorios} onViewAll={() => onKindChange('accesorio')} />}
            </div>
          )}
        </>
      )}

      <TradeSheet open={!!tradeMarket} onClose={closeTrade}>
        {tradeMarket && (
          <BetBox
            key={`${tradeMarket.id}-${tradeOutcome ?? ''}`}
            marketId={tradeMarket.id}
            yesPrice={tradeMarket.yesPrice}
            marketType={tradeMarket.marketType === 'multi' ? 'multi' : 'binary'}
            outcomes={tradeMarket.outcomes ?? []}
            selectedOutcomeKey={tradeOutcome}
            onOutcomeSelect={setTradeOutcome}
            subcategory={tradeMarket.subcategory}
            initialSide="YES"
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
