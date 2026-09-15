import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiPricePoint, type ApiContenidoCategoria } from '../../lib/api'
import type { Market, PricePoint } from '../../types'
import type { MultiSeries } from '../SparkChart'
import { BetBox } from '../BetBox'
import { TradeSheet } from '../TradeSheet'
import { AuthModal } from '../AuthModal'
import { PoliticaHero } from './PoliticaHero'
import { PoliticaTopics, type TopicRow, type SourceRow } from './PoliticaTopics'
import { ElectionTimeline } from './ElectionTimeline'
import { SeatProjection } from './SeatProjection'
import { PartyTable } from './PartyTable'
import { PoliticaSections, type MarketSection } from './PoliticaSections'
import { byClosing } from '../../lib/closing'

interface PoliticaLandingProps {
  // Todos los mercados cargados por Markets.tsx; la landing filtra por categoría.
  markets: Market[]
  loading: boolean
  // Subcategorías declaradas (categories.ts) en orden de display
  subcats: string[]
  // ?sub= controlado por Markets.tsx
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  // Tras operar en el sheet, Markets.tsx parchea el precio en su estado
  onTraded: (marketId: string, newYesPrice: number) => void
}

export const POLITICA = 'Política'
const HISTORY_DAYS = 90
const DAY_MS = 86_400_000

// Historial binario → puntos de gráfica con timestamp completo (el Δ de 7 días
// necesita la hora; FeaturedCarousel trunca a día porque no la usa).
function toPoints(hist: ApiPricePoint[]): PricePoint[] {
  return hist
    .filter(p => !p.outcome_key && p.yes_price > 0)
    .map(p => ({ date: p.recorded_at, price: p.yes_price }))
}

// Cambio del Sí en 7 días: último precio menos el vigente hace 7 días
// (último punto anterior al corte; si no hay, el primero, como movers.py).
function delta7(points: PricePoint[]): number | null {
  if (points.length < 2) return null
  const cutoff = Date.now() - 7 * DAY_MS
  let base = points[0]
  for (const p of points) {
    if (Date.parse(p.date) <= cutoff) base = p
    else break
  }
  return Math.round(points[points.length - 1].price - base.price)
}

// Mercados abiertos, trending primero y luego por volumen (misma regla que FeaturedCarousel).
export function featuredCandidates(markets: Market[]): Market[] {
  return markets
    .filter(m => m.category === POLITICA && m.status === 'open')
    .sort((a, b) => {
      if (a.trending !== b.trending) return a.trending ? -1 : 1
      return b.volume - a.volume
    })
}

// Host sin "www." para agrupar fuentes (www.ine.mx y ine.mx son la misma)
function hostOf(url: string): string | null {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return null }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

// Landing de /mercados?cat=Política: hero destacado con compra en sitio,
// temas, cronología, proyección de escaños y secciones por subcategoría.
// Markets.tsx solo la monta cuando hay un mercado trending abierto.
export function PoliticaLanding({ markets, loading, subcats, activeSub, onSubChange, onTraded }: PoliticaLandingProps) {
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

  // Temas: subcategorías declaradas con mercados + "Otros" (sin subcategoría o no declarada)
  const topics = useMemo<TopicRow[]>(() => {
    const counts = new Map<string | null, number>()
    for (const m of inCat) {
      const key = m.subcategory && subcats.includes(m.subcategory) ? m.subcategory : null
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const out: TopicRow[] = subcats.filter(sub => counts.has(sub)).map(sub => ({ sub, count: counts.get(sub) ?? 0 }))
    const rest = counts.get(null)
    if (rest) out.push({ sub: null, count: rest })
    return out
  }, [inCat, subcats])

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

  // Tercer dato de la fila: nota curada, si no la fuente en corto
  const extraMetaOf = useCallback((m: Market): string | null => {
    const nota = content?.notas[m.id]
    if (nota) return nota
    const host = m.resolutionSourceUrl ? hostOf(m.resolutionSourceUrl) : null
    return host ? labelForHost(host) : null
  }, [content, labelForHost])

  // Secciones por subcategoría declarada (orden de categories.ts) + "Otros";
  // con ?sub= activo, solo esa sección. Una sección vacía no se renderiza.
  const sections = useMemo<MarketSection[]>(() => {
    const byKey = new Map<string | null, Market[]>()
    for (const m of inCat) {
      const key = m.subcategory && subcats.includes(m.subcategory) ? m.subcategory : null
      byKey.set(key, [...(byKey.get(key) ?? []), m])
    }
    const out: MarketSection[] = []
    for (const sub of subcats) {
      const items = byKey.get(sub)
      if (items?.length) out.push({ title: sub, sub, items: items.sort(byClosing) })
    }
    const rest = byKey.get(null)
    if (rest?.length) out.push({ title: t('categoryBrowse.otherSection'), sub: null, items: rest.sort(byClosing) })
    return activeSub ? out.filter(sec => sec.sub === activeSub) : out
  }, [inCat, subcats, activeSub, t])

  // "Prob. de 334+": la única cifra viva de la proyección
  const thresholdId = content?.proyeccion?.mercado_umbral_id ?? null
  const thresholdMarket = thresholdId ? inCat.find(m => m.id === thresholdId) : undefined
  const thresholdProb = thresholdMarket ? thresholdMarket.yesPrice : null

  const featuredPoints = featured ? histories[featured.id] : undefined
  const historyLoading = !!featured && featuredPoints === undefined

  // Compra en sitio (patrón de Home): el sheet lee el mercado vivo por id
  const [trade, setTrade] = useState<{ marketId: string; side: 'YES' | 'NO' } | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const closeTrade = useCallback(() => setTrade(null), [])
  const tradeMarket = trade ? inCat.find(m => m.id === trade.marketId) ?? null : null

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('common.loading')}>
        <div className="pol-hero">
          <div className="skeleton" style={{ height: 360 }} />
          <div className="skeleton" style={{ height: 360 }} />
        </div>
      </div>
    )
  }

  if (!featured) return null

  return (
    <div style={{ marginBottom: 48 }}>
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
        <PoliticaTopics
          total={inCat.length}
          topics={topics}
          activeSub={activeSub}
          onSelect={onSubChange}
          sources={sources}
        />
      </div>

      {content?.cronologia && (
        <ElectionTimeline
          className="anim-2"
          titulo={content.cronologia.titulo}
          subtitulo={content.cronologia.subtitulo}
          hitos={content.cronologia.hitos}
        />
      )}

      {content?.proyeccion && (
        <div className="pol-cards anim-3">
          <SeatProjection proyeccion={content.proyeccion} partidos={content.partidos} thresholdProb={thresholdProb} />
          <PartyTable bloques={content.proyeccion.bloques} total={content.proyeccion.total} partidos={content.partidos} />
        </div>
      )}

      <PoliticaSections
        className="anim-4"
        sections={sections}
        activeSub={activeSub}
        onViewAll={sub => onSubChange(sub)}
        onClearSub={() => onSubChange(null)}
        extraMetaOf={extraMetaOf}
      />

      <TradeSheet open={!!tradeMarket} onClose={closeTrade}>
        {tradeMarket && trade && (
          <BetBox
            key={`${tradeMarket.id}-${trade.side}`}
            marketId={tradeMarket.id}
            yesPrice={tradeMarket.yesPrice}
            marketType={tradeMarket.marketType === 'multi' ? 'multi' : 'binary'}
            outcomes={tradeMarket.outcomes ?? []}
            subcategory={tradeMarket.subcategory}
            initialSide={trade.side}
            compact
            onRequireAuth={() => { setTrade(null); setAuthOpen(true) }}
            onTraded={p => onTraded(tradeMarket.id, p)}
          />
        )}
      </TradeSheet>
      {authOpen && <AuthModal initialMode="register" onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
