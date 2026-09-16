import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Market, PricePoint } from '../../types'
import { MarketRow } from '../MarketRow'
import { SeeMoreButton } from '../SeeMoreButton'
import { useSparks, type SparkItem } from '../../lib/useSparks'
import { topOutcome } from '../../lib/seatProjection'

export interface MarketSection {
  title: string
  // Subcategoría (identificador para ?sub=); null = "Otros", no navegable
  sub: string | null
  items: Market[]
}

interface PoliticaSectionsProps {
  sections: MarketSection[]
  activeSub: string | null
  onViewAll: (sub: string) => void
  onClearSub: () => void
  // Tercer dato de la meta de la fila (nota curada o fuente); null si no hay
  extraMetaOf: (m: Market) => string | null
  className?: string
}

const PAGE = 5
const SPARK_DAYS = 7

// Serie del sparkline: el Sí en binarios; en multi la opción líder (yes_price
// de un multi es 0 y el historial trae todas las opciones intercaladas).
const sparkItemOf = (m: Market): SparkItem => ({
  id: m.id,
  outcomeKey: m.marketType === 'multi' ? topOutcome(m)?.outcome_key ?? null : null,
})
const sparkPriceOf = (m: Market) => (m.marketType === 'multi' ? topOutcome(m)?.price ?? 0 : m.yesPrice)

// El historial de 7 días de un mercado sin operaciones trae 0 o 1 puntos: se
// completa con el precio actual para pintar la línea plana (color neutro).
function sparkOf(points: PricePoint[] | null | undefined, m: Market): PricePoint[] | null {
  if (points === undefined || points === null) return points ?? null
  if (points.length >= 2) return points
  const now = new Date()
  const start = new Date(now.getTime() - SPARK_DAYS * 86_400_000)
  const price = sparkPriceOf(m)
  const first = points[0] ?? { date: start.toISOString(), price }
  return [first, { date: now.toISOString(), price }]
}

// Secciones de filas por subcategoría con sparkline de 7 días. Con ?sub=
// activo solo se muestra esa sección completa; si no, PAGE filas por sección
// y "Ver más". Los sparklines se piden solo para las filas en pantalla.
export function PoliticaSections({ sections, activeSub, onViewAll, onClearSub, extraMetaOf, className = '' }: PoliticaSectionsProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState<Record<string, number>>({})
  const keyOf = (sub: string | null) => sub ?? '__otros'

  const shown = useMemo(
    () => sections.map(sec => ({
      ...sec,
      shown: activeSub ? sec.items : sec.items.slice(0, visible[keyOf(sec.sub)] ?? PAGE),
    })),
    [sections, activeSub, visible],
  )
  const visibleItems = useMemo(() => shown.flatMap(s => s.shown.map(sparkItemOf)), [shown])
  const sparks = useSparks(visibleItems, SPARK_DAYS)

  if (sections.length === 0) {
    return (
      <div className={className} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
        <p style={{ fontWeight: 600, margin: '0 0 12px' }}>{t('categoryBrowse.emptyFilter')}</p>
        {activeSub && (
          <button type="button" className="btn btn-secondary" onClick={onClearSub}>{t('politica.topicsViewAll')}</button>
        )}
      </div>
    )
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {shown.map((sec, si) => (
        <section key={keyOf(sec.sub)}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', marginBottom: 2 }}>
            <h3 className="section-title">{sec.title}</h3>
            <span className="num meta-label">{sec.items.length}</span>
            {sec.sub !== null && !activeSub && (
              <button
                type="button"
                onClick={() => onViewAll(sec.sub as string)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}
              >
                {t('home.viewAll')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sec.shown.map((m, i) => (
              <MarketRow
                key={m.id}
                market={m}
                hideBadge
                padding="14px 0"
                spark={sparkOf(sparks[m.id], m)}
                extraMeta={extraMetaOf(m)}
                animClass={si === 0 ? `anim-${Math.min(i + 1, 6)}` : ''}
              />
            ))}
          </div>
          {sec.items.length > sec.shown.length && (
            <SeeMoreButton
              remaining={sec.items.length - sec.shown.length}
              onClick={() => setVisible(v => ({ ...v, [keyOf(sec.sub)]: (v[keyOf(sec.sub)] ?? PAGE) + PAGE }))}
            />
          )}
        </section>
      ))}
    </div>
  )
}
