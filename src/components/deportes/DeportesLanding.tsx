import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketsApi, contenidoApi, type ApiContenidoCategoria, type ApiResumenCategoria } from '../../lib/api'
import type { Category, Market } from '../../types'
import { LigasRail, type LigaCard } from './LigasRail'
import { LeagueMark } from './LeagueMark'
import { Marcador } from './Marcador'
import { TituloTable } from './TituloTable'
import { OpcionesChart } from '../panel/OpcionesChart'
import { VolumenTemas } from '../panel/VolumenTemas'
import { formatVolume } from '../../lib/format'
import { diaKeyOf } from '../../lib/jornada'
import { useEnVivo } from '../../lib/useEnVivo'

interface DeportesLandingProps {
  // Todos los mercados cargados por la página; la landing filtra por categoría
  markets: Market[]
  loading: boolean
  // Liga y día controlados: /mercados los sincroniza con la URL (?sub= ?dia=), la Home
  // los guarda en estado local (Mark no quiere salir de la portada)
  activeSub: string | null
  onSubChange: (sub: string | null) => void
  activeDia: string | null
  onDiaChange: (dia: string | null) => void
  // h1 + conteo arriba (Home); Markets.tsx ya tiene su propia cabecera
  showHeader?: boolean
}

export const DEPORTES: Category = 'Deportes'

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

// Panel de Deportes (se abre desde la tarjeta panel del grid; Mark, 2026-09-24): riel de
// ligas que filtra el panel, marcador de la jornada, carrera por el título (gráfica de
// 90 días + tabla) y volumen por liga. Sin listas de mercados (están en el grid). Cada
// bloque se monta solo si su dato llegó de la API; nada ilustrativo.
export function DeportesLanding({ markets, loading, activeSub, onSubChange, activeDia, onDiaChange, showHeader = false }: DeportesLandingProps) {
  const { t } = useTranslation()
  const inCat = useMemo(() => markets.filter(m => m.category === DEPORTES), [markets])
  const inScope = useMemo(() => (activeSub ? inCat.filter(m => m.subcategory === activeSub) : inCat), [inCat, activeSub])

  // Marcador en vivo de los partidos en ventana (poll de 1 min; {} si no hay o el poller está apagado)
  const live = useEnVivo(inCat)

  // Agregados (riel de ligas y volumen por liga); sin respuesta, esos bloques no se montan
  const [resumen, setResumen] = useState<ApiResumenCategoria | null>(null)
  useEffect(() => {
    let alive = true
    marketsApi.resumen(DEPORTES).then(r => { if (alive) setResumen(r) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Contenido curado (contenido_categorias/deportes.py): mercado de campeón por liga
  const [content, setContent] = useState<ApiContenidoCategoria | null>(null)
  useEffect(() => {
    let alive = true
    contenidoApi.categoria(DEPORTES).then(c => { if (alive) setContent(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Riel: todas las ligas con mercados abiertos, por volumen acumulado (GET /markets/resumen)
  const ligas = useMemo<LigaCard[]>(
    () => (resumen?.subcategorias ?? []).filter(s => s.abiertos > 0).map(s => ({ sub: s.subcategory, abiertos: s.abiertos, volumen: s.volumen_total })),
    [resumen],
  )

  // Carrera por el título: la liga activa o la primera del riel con multi de campeón cargado.
  // Una liga puede traer varios (Boxeo: un multi por cinturón); entonces cada tarjeta se
  // titula con su pregunta en vez de «Probabilidad de título».
  const titulos = content?.titulos
  const { tituloLiga, tituloMarkets, varios } = useMemo(() => {
    const multisDe = (liga: string) => {
      const v = titulos?.[liga]
      const ids = v === undefined ? [] : Array.isArray(v) ? v : [v]
      return { ms: ids.flatMap(id => inCat.find(m => m.id === id && m.marketType === 'multi') ?? []), varios: Array.isArray(v) }
    }
    const candidatas = activeSub ? [activeSub] : ligas.map(l => l.sub)
    for (const liga of candidatas) {
      const { ms, varios } = multisDe(liga)
      if (ms.length) return { tituloLiga: liga, tituloMarkets: ms, varios }
    }
    return { tituloLiga: null, tituloMarkets: [], varios: false }
  }, [activeSub, ligas, titulos, inCat])

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
        <div className="ligas-rail" style={{ marginBottom: 22 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ flex: '0 0 auto', width: 178, height: 96 }} />)}
        </div>
        <div className="marcador-grid" style={{ marginBottom: 28 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}
        </div>
        <div className="dep-cards">
          <div className="skeleton" style={{ height: 320 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 48 }}>
      {header}

      {ligas.length > 0 && (
        <div className="anim-1" style={{ marginBottom: 22 }}>
          <LigasRail ligas={ligas} active={activeSub} onSelect={onSubChange} />
        </div>
      )}

      <Marcador className="anim-2" markets={inScope} activeDia={activeDia} onDiaChange={onDiaChange} live={live} />

      {tituloLiga && tituloMarkets.map((m, i) => (
        <div key={m.id} className={i === 0 ? 'anim-3' : undefined} style={{ marginBottom: 14 }}>
          <OpcionesChart market={m} title={varios ? m.question : t('panel.carreraTitulo', { liga: tituloLiga })} />
        </div>
      ))}

      <div className="dep-cards anim-4">
        {tituloLiga && tituloMarkets.map(m => <TituloTable key={m.id} market={m} liga={tituloLiga} title={varios ? m.question : undefined} />)}
        {resumen && <VolumenTemas resumen={resumen} title={t('deportes.volumeByLeague')} mark={sub => <LeagueMark sub={sub} size={20} radius={5} />} />}
      </div>
    </div>
  )
}
