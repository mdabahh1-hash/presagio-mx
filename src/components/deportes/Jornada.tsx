import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LiveState, Market } from '../../types'
import { MarketRow, type RowLead } from '../MarketRow'
import { Badge } from '../Badge'
import { Tabs } from '../Tabs'
import { agruparPorDia, diaLabel, diaLong, eventAt, horaCdmx, diaCortoCdmx, CDMX_TZ } from '../../lib/jornada'
import { formatDate } from '../../lib/format'

interface JornadaProps {
  markets: Market[]
  activeDia: string | null
  onDiaChange: (dia: string | null) => void
  extraMetaOf: (m: Market) => string | null
  live?: Record<string, LiveState>
  // Hay algún filtro activo (liga, deporte, tipo): muestra "Quitar filtros"
  hasFilters: boolean
  onClearFilters: () => void
  className?: string
}

const CLOSING_SOON_MS = 3 * 3_600_000
const DAY_MS = 86_400_000

// Jornada: pestañas por día (solo días con filas), subtítulo con la fecha larga y filas
// con pista de resultados de ancho fijo y columna de hora/estado.
export function Jornada({ markets, activeDia, onDiaChange, extraMetaOf, live, hasFilters, onClearFilters, className = '' }: JornadaProps) {
  const { t } = useTranslation()
  const groups = useMemo(() => agruparPorDia(markets), [markets])
  const keys = groups.map(g => g.key)
  const current = activeDia ?? keys[0] ?? 'hoy'
  const items = groups.map(g => ({ key: g.key, label: diaLabel(g.key), count: g.items.length }))
  if (activeDia && !keys.includes(activeDia)) items.push({ key: activeDia, label: diaLabel(activeDia), count: 0 })
  const shown = groups.find(g => g.key === current)?.items ?? []
  const fecha = diaLong(current)

  const leadOf = (m: Market): RowLead => {
    const lv = live?.[m.id]
    if (lv?.estado === 'LIVE') {
      // Periodo corto: "2T" en fútbol, "Q3" en la NFL
      const periodo = lv.periodo ? (m.subcategory === 'NFL' ? `Q${lv.periodo}` : `${lv.periodo}T`) : null
      return { primary: lv.reloj ?? t('common.live'), secondary: periodo, tone: 'live' }
    }
    const ev = eventAt(m)
    // Sin hora de evento (futuros, F1, boxeo) la columna muestra la fecha de cierre
    if (!m.kickoffAt) {
      return { primary: formatDate(ev, { day: 'numeric', month: 'short', timeZone: CDMX_TZ }).replace('.', ''), secondary: t('deportes.closeLabel') }
    }
    const diff = Date.parse(ev) - Date.now()
    let secondary: string | null
    if (diff > 0 && diff < DAY_MS) {
      const hours = Math.floor(diff / 3_600_000)
      secondary = hours >= 1 ? t('deportes.inHours', { count: hours }) : t('deportes.inMinutes', { count: Math.max(1, Math.floor(diff / 60_000)) })
    } else {
      secondary = diaCortoCdmx(ev)
    }
    return { primary: horaCdmx(ev), secondary }
  }

  const badgesOf = (m: Market) => {
    const lv = live?.[m.id]
    const closingSoon = m.status === 'open' && Date.parse(m.endsAt) - Date.now() <= CLOSING_SOON_MS && Date.parse(m.endsAt) > Date.now()
    return (
      <>
        {m.subcategory && <Badge tone="category" color="var(--cat-gold)" bg="var(--cat-gold-bg)">{m.subcategory}</Badge>}
        {lv?.estado === 'LIVE' && <Badge tone="green"><span className="live-dot" />{t('common.live')}</Badge>}
        {closingSoon && <Badge tone="red">{t('deportes.closingSoon')}</Badge>}
        {m.kind === 'accesorio' && <Badge>{t('deportes.prop')}</Badge>}
      </>
    )
  }

  return (
    <section className={className} style={{ marginBottom: 30 }}>
      <div className="dep-jornada-head tabs-line">
        <Tabs<string> items={items} active={current} onChange={key => onDiaChange(key)} ariaLabel={t('deportes.jornada')} style={{ minWidth: 0, flex: 1 }} />
        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearFilters} style={{ flexShrink: 0, marginBottom: 6 }}>
            {t('deportes.clearFilters')}
          </button>
        )}
      </div>
      <p className="meta-label num" style={{ margin: '10px 0 8px' }}>
        {fecha ? t('deportes.daySubtitle', { date: fecha, count: shown.length }) : t('categoryBrowse.marketCount', { count: shown.length })}
      </p>
      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>{t('categoryBrowse.emptyFilter')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((m, i) => (
            <MarketRow
              key={m.id}
              market={m}
              fixedTrack
              lead={leadOf(m)}
              badges={badgesOf(m)}
              hideBadge
              live={live?.[m.id] ?? null}
              extraMeta={extraMetaOf(m)}
              padding="13px 0"
              animClass={i < 6 ? `anim-${i + 1}` : ''}
            />
          ))}
        </div>
      )}
    </section>
  )
}
