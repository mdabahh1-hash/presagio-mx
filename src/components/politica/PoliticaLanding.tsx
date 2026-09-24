import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiPricePoint, type ApiContenidoCategoria, type ApiResumenCategoria } from '../../lib/api'
import type { Market, PricePoint } from '../../types'
import type { MultiSeries } from '../SparkChart'
import { QuickTradeSheet } from '../QuickTradeSheet'
import { PoliticaHero } from './PoliticaHero'
import { PoliticaFuentes, type SourceRow } from './PoliticaFuentes'
import { ElectionTimeline } from './ElectionTimeline'
import { SeatProjection } from './SeatProjection'
import { PartyTable } from './PartyTable'
import { OpcionesChart } from '../panel/OpcionesChart'
import { MoversCard } from '../panel/MoversCard'
import { VolumenTemas } from '../panel/VolumenTemas'
import { formatVolume } from '../../lib/format'
import { projectSeats } from '../../lib/seatProjection'
import { deltaSince, DAY_MS } from '../../lib/priceDelta'

interface PoliticaLandingProps {
  // Todos los mercados cargados por Markets.tsx; la landing filtra por categoría.
  markets: Market[]
  loading: boolean
  // Tras operar en el sheet, la página parchea el precio en su estado
  onTraded: (marketId: string, newYesPrice: number) => void
  // h1 + conteo arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
}

export const POLITICA = 'Política'
const HISTORY_DAYS = 90

// Historial binario → puntos de gráfica con timestamp completo (el Δ de 7 días
// necesita la hora; FeaturedCarousel trunca a día porque no la usa).
function toPoints(hist: ApiPricePoint[]): PricePoint[] {
  return hist
    .filter(p => !p.outcome_key && p.yes_price > 0)
    .map(p => ({ date: p.recorded_at, price: p.yes_price }))
}

// Cambio del Sí en 7 días (lib/priceDelta, compartido con la landing de Deportes)
const delta7 = (points: PricePoint[]) => deltaSince(points, 7 * DAY_MS)

// Mercados abiertos, trending primero y luego por volumen (misma regla que FeaturedCarousel).
export function featuredCandidates(markets: Market[]): Market[] {
  return markets
    .filter(m => m.category === POLITICA && m.status === 'open')
    .sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return b.volume - a.volume
    })
}

// La landing se monta (Home y /mercados?cat=Política) solo con un mercado
// trending abierto; mientras carga se muestra su skeleton. Si no, CategoryBrowse.
export function politicaLandingAvailable(markets: Market[], loading: boolean): boolean {
  return loading || featuredCandidates(markets).some(m => m.trending)
}

// Host sin "www." para agrupar fuentes (www.ine.mx y ine.mx son la misma)
function hostOf(url: string): string | null {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return null }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

// Panel de Política (se abre desde la tarjeta panel del grid): hero destacado con
// compra en sitio, volumen por tema, cronología, proyección de escaños, escaños en el
// tiempo, los que más se movieron y fuentes. Sin listas de mercados (esas están en el
// grid). Se monta solo con un mercado trending abierto.
export function PoliticaLanding({ markets, loading, onTraded, showHeader = false }: PoliticaLandingProps) {
  const { t } = useTranslation()
  const inCat = useMemo(() => markets.filter(m => m.category === POLITICA), [markets])
  const candidates = useMemo(() => featuredCandidates(inCat), [inCat])
  const featured = candidates[0] ?? null

  // Contenido curado (contenido_categorias/politica.py); si falla, la landing
  // sigue con lo que sale del listado (sin cronología ni tarjetas).
  const [content, setContent] = useState<ApiContenidoCategoria | null>(null)
  useEffect(() => {
    let alive = true
    contenidoApi.categoria(POLITICA)
      .then(c => { if (alive) setContent(c) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Volumen por tema (GET /markets/resumen); sin él, la columna del hero lleva las fuentes
  const [resumen, setResumen] = useState<ApiResumenCategoria | null>(null)
  useEffect(() => {
    let alive = true
    marketsApi.resumen(POLITICA).then(r => { if (alive) setResumen(r) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const secondary = useMemo(() => {
    if (!featured) return null
    const wanted = content?.hero.secundario_id
    const curated = wanted ? candidates.find(m => m.id === wanted && m.id !== featured.id) : undefined
    return curated ?? candidates.find(m => m.id !== featured.id) ?? null
  }, [featured, candidates, content])

  // Historial de 90 días del destacado y del secundario, una vez por id
  const [histories, setHistories] = useState<Record<string, PricePoint[]>>({})
  const requested = useRef(new Set<string>())
  useEffect(() => {
    const ids = [featured?.id, secondary?.id].filter((id): id is string => !!id && !requested.current.has(id))
    ids.forEach(id => {
      requested.current.add(id)
      marketsApi.history(id, HISTORY_DAYS)
        .then(h => setHistories(prev => ({ ...prev, [id]: toPoints(h) })))
        .catch(() => setHistories(prev => ({ ...prev, [id]: [] })))
    })
  }, [featured?.id, secondary?.id])

  const labelOf = useCallback(
    (m: Market) => content?.notas[m.id] ?? truncate(m.question, 48),
    [content],
  )

  const series = useMemo<MultiSeries[]>(() => {
    if (!featured) return []
    const out: MultiSeries[] = [
      { outcome_key: 'featured', label: labelOf(featured), data: histories[featured.id] ?? [], color: 'var(--text-primary)' },
    ]
    if (secondary) {
      out.push({ outcome_key: 'secondary', label: labelOf(secondary), data: histories[secondary.id] ?? [], color: 'var(--text-tertiary)' })
    }
    return out
  }, [featured, secondary, histories, labelOf])

  const labelForHost = useCallback(
    (host: string) => content?.fuentes.find(f => f.host === host)?.etiqueta ?? host,
    [content],
  )

  // Fuentes oficiales: hosts únicos de resolution_source_url, etiqueta curada o el host
  const sources = useMemo<SourceRow[]>(() => {
    const byHost = new Map<string, SourceRow>()
    for (const m of inCat) {
      if (!m.resolutionSourceUrl) continue
      const host = hostOf(m.resolutionSourceUrl)
      if (!host) continue
      const cur = byHost.get(host)
      if (cur) cur.count += 1
      else byHost.set(host, { host, label: labelForHost(host), url: m.resolutionSourceUrl, count: 1 })
    }
    return [...byHost.values()].sort((a, b) => b.count - a.count)
  }, [inCat, labelForHost])

  // Proyección de escaños: esperados con los precios vivos de los mercados de rangos
  const projection = useMemo(
    () => (content?.proyeccion ? projectSeats(content.proyeccion, inCat) : null),
    [content, inCat],
  )
  const hasProjection = !!projection && projection.rows.some(r => r.seats !== null)

  // "Prob. de 334+": yes_price del binario del umbral
  const thresholdId = content?.proyeccion?.mercado_umbral_id ?? null
  const thresholdMarket = thresholdId ? inCat.find(m => m.id === thresholdId) : undefined
  const thresholdProb = thresholdMarket ? thresholdMarket.yesPrice : null

  // Escaños en el tiempo: el multi de rangos del primer partido de la proyección
  const bloque = content?.proyeccion?.bloques[0]
  const rangoMarket = bloque ? inCat.find(m => m.id === bloque.mercado_id && m.marketType === 'multi') : undefined
  const rangoPartido = bloque ? content?.partidos.find(p => p.clave === bloque.partido)?.siglas ?? bloque.partido : ''

  const featuredPoints = featured ? histories[featured.id] : undefined
  const historyLoading = !!featured && featuredPoints === undefined

  // Compra en sitio (patrón de Home): el sheet lee el mercado vivo por id
  const [trade, setTrade] = useState<{ marketId: string; side: 'YES' | 'NO' } | null>(null)
  const closeTrade = useCallback(() => setTrade(null), [])
  const tradeMarket = trade ? inCat.find(m => m.id === trade.marketId) ?? null : null

  const header = showHeader && (
    <div className="anim-1" style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{POLITICA}</h1>
      <p className="meta-label" style={{ margin: 0 }}>
        {loading ? t('common.loading') : (
          <span className="num">{t('politica.headerMeta', { count: inCat.length, volume: formatVolume(inCat.reduce((s, m) => s + m.volume, 0)) })}</span>
        )}
      </p>
    </div>
  )

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')} style={{ marginBottom: 48 }}>
        {header}
        <div className="pol-hero">
          <div className="skeleton" style={{ height: 360 }} />
          <div className="skeleton" style={{ height: 360 }} />
        </div>
        <div className="skeleton" style={{ height: 120, marginBottom: 14 }} />
        <div className="pol-cards">
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  if (!featured) return null

  return (
    <div style={{ marginBottom: 48 }}>
      {header}
      {content?.resumen && (
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 760, lineHeight: 1.5 }}>
          {content.resumen}
        </p>
      )}

      <div className="pol-hero anim-1">
        <PoliticaHero
          market={featured}
          series={series}
          historyLoading={historyLoading}
          delta7={featuredPoints ? delta7(featuredPoints) : null}
          onBuy={side => setTrade({ marketId: featured.id, side })}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {resumen && <VolumenTemas resumen={resumen} title={t('panel.volumenTema')} />}
          <PoliticaFuentes sources={sources} />
        </div>
      </div>

      {content?.cronologia && (
        <ElectionTimeline
          className="anim-2"
          titulo={content.cronologia.titulo}
          subtitulo={content.cronologia.subtitulo}
          fuenteUrl={content.cronologia.fuente_url}
          hitos={content.cronologia.hitos}
        />
      )}

      {content?.proyeccion && projection && hasProjection && (
        <div className="pol-cards anim-3">
          <SeatProjection proyeccion={content.proyeccion} partidos={content.partidos} projection={projection} thresholdProb={thresholdProb} />
          <PartyTable rows={projection.rows} total={projection.total} partidos={content.partidos} />
        </div>
      )}

      {rangoMarket && (
        <div className="anim-4" style={{ marginBottom: 14 }}>
          <OpcionesChart market={rangoMarket} title={t('panel.escanosTiempo', { partido: rangoPartido })} />
        </div>
      )}
      <MoversCard category={POLITICA} />

      {/* Sin opción controlada: el BetBox lleva su propia selección */}
      <QuickTradeSheet
        market={tradeMarket}
        side={trade?.side ?? 'YES'}
        betKey={`${trade?.marketId}-${trade?.side}`}
        onClose={closeTrade}
        onTraded={p => tradeMarket && onTraded(tradeMarket.id, p)}
      />
    </div>
  )
}
