import React, { useEffect, useState } from 'react'
import { probText } from '../../lib/prices'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LiveState, Market } from '../../types'
import { marketsApi, type ApiMover, type ApiResumenSubcategoria } from '../../lib/api'
import { LeagueMark } from './LeagueMark'
import { Jornada } from './Jornada'
import { TituloTable } from './TituloTable'
import { TeamMark } from '../TeamMark'
import { Tabs } from '../Tabs'
import { KINDS, kindLabelKey, type Kind } from '../../lib/categories'
import { formatVolume } from '../../lib/format'
import { cleanLabel } from '../../lib/mapMarket'
import { topOutcome } from '../../lib/seatProjection'

interface LigaViewProps {
  liga: string
  sport: string | null
  // Mercados de la liga (todos los tipos); el tab de tipo filtra aquí
  markets: Market[]
  resumen: ApiResumenSubcategoria | null
  tituloMarket: Market | null
  activeKind: Kind | null
  onKindChange: (kind: Kind | null) => void
  activeDia: string | null
  onDiaChange: (dia: string | null) => void
  extraMetaOf: (m: Market) => string | null
  onClear: () => void
  live?: Record<string, LiveState>
  className?: string
}

const MOVERS_LIMIT = 5

function MoversCard({ movers }: { movers: ApiMover[] }) {
  const { t } = useTranslation()
  return (
    <div className="card" style={{ padding: '15px 16px 14px', minWidth: 0 }}>
      <h3 className="section-title" style={{ marginBottom: 2 }}>{t('deportes.movers')}</h3>
      <p className="meta-label" style={{ margin: '0 0 10px' }}>{t('deportes.moversSubtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {movers.map(m => (
          <Link key={`${m.id}-${m.outcome_key ?? ''}`} to={`/mercado/${m.id}`} className="list-row is-link" style={{ padding: '8px 0', gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cleanLabel(m.question)}>
              {m.outcome_label ? cleanLabel(m.outcome_label) : cleanLabel(m.question)}
            </span>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: m.change > 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
              {m.change > 0 ? '+' : '−'}{Math.abs(Math.round(m.change))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// Vista de liga (nivel 2 de la landing de Deportes, ?sub=): cabecera con logo y
// favorito al título / mayor movimiento, tabs de tipo cuando hay partidos y
// accesorios, jornada a la izquierda y título, movimiento y ligas privadas a la
// derecha. Cada tarjeta se monta solo si su dato existe.
export function LigaView({
  liga, sport, markets, resumen, tituloMarket, activeKind, onKindChange, activeDia, onDiaChange, extraMetaOf, onClear, live, className = '',
}: LigaViewProps) {
  const { t } = useTranslation()
  const [movers, setMovers] = useState<ApiMover[] | null>(null)
  useEffect(() => {
    let alive = true
    setMovers(null)
    marketsApi.movers(24, MOVERS_LIMIT, { subcategory: liga })
      .then(m => { if (alive) setMovers(m) })
      .catch(() => { if (alive) setMovers([]) })
    return () => { alive = false }
  }, [liga])

  const kindCounts: Record<Kind, number> = { partido: 0, accesorio: 0 }
  for (const m of markets) if (m.kind) kindCounts[m.kind]++
  const kindVisible = kindCounts.partido > 0 && kindCounts.accesorio > 0
  const shown = activeKind && kindVisible ? markets.filter(m => m.kind === activeKind) : markets
  const abiertos = resumen?.abiertos ?? markets.filter(m => m.status === 'open').length
  const volumen = resumen?.volumen_total ?? markets.reduce((s, m) => s + m.volume, 0)
  const favorito = tituloMarket ? topOutcome(tituloMarket) : null
  const top = movers?.[0] ?? null
  const crumbs = ['Deportes', sport && sport !== liga ? sport : null, liga].filter(Boolean).join(' · ')

  return (
    <div className={className}>
      <div className="meta-label num" style={{ marginBottom: 12 }}>{crumbs}</div>
      <div className="liga-head">
        <LeagueMark sub={liga} size={56} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>{liga}</h2>
          <p className="meta-label num" style={{ margin: 0 }}>{t('deportes.leagueMeta', { count: abiertos, volume: formatVolume(volumen) })}</p>
        </div>
        {(favorito || top) && (
          <div className="liga-stats">
            {favorito && tituloMarket && (
              <div>
                <div className="meta-label">{t('deportes.favorite')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <TeamMark label={favorito.label} outcomeKey={favorito.outcome_key} sub={liga} marketId={tituloMarket.id} size={18} />
                  <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{favorito.label} {probText(favorito.price, tituloMarket.status)}</span>
                </div>
              </div>
            )}
            {top && (
              <div style={{ minWidth: 0 }}>
                <div className="meta-label">{t('deportes.topMover')}</div>
                <div className="num" style={{ marginTop: 3, fontSize: 16, fontWeight: 600, color: top.change > 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                  {cleanLabel(top.outcome_label ?? top.question)} {top.change > 0 ? '+' : '−'}{Math.abs(Math.round(top.change))} pp
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {kindVisible && (
        <Tabs<'all' | Kind>
          className="tabs-line"
          style={{ marginBottom: 16 }}
          items={[
            { key: 'all', label: t('deportes.allKinds'), count: markets.length },
            ...KINDS.map(k => ({ key: k, label: t(kindLabelKey(k)), count: kindCounts[k] })),
          ]}
          active={activeKind ?? 'all'}
          onChange={k => onKindChange(k === 'all' ? null : k)}
        />
      )}

      <div className="liga-body">
        <Jornada
          markets={shown}
          activeDia={activeDia}
          onDiaChange={onDiaChange}
          extraMetaOf={extraMetaOf}
          live={live}
          hasFilters
          onClearFilters={onClear}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {tituloMarket && <TituloTable market={tituloMarket} liga={liga} compact />}
          {movers && movers.length > 0 && <MoversCard movers={movers} />}
          <div className="card" style={{ padding: '15px 16px 16px' }}>
            <h3 className="section-title" style={{ marginBottom: 6 }}>{t('deportes.privateLeagues')}</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{t('deportes.privateLeaguesText')}</p>
            <Link to="/ligas/crear" className="btn btn-secondary" style={{ width: '100%' }}>{t('deportes.createLeague')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
