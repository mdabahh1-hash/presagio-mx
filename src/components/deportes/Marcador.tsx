import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LiveState, Market } from '../../types'
import { Tabs } from '../Tabs'
import { TeamMark } from '../TeamMark'
import { outcomeColor } from '../SparkChart'
import { agruparPorDia, diaLabel, horaCdmx, diaCortoCdmx, eventAt } from '../../lib/jornada'
import { matchOutcomes, orderOutcomes } from '../../lib/outcomeOrder'
import { cleanLabel } from '../../lib/mapMarket'
import { probText } from '../../lib/prices'

export interface Segmento { key: string; label: string; price: number; pct: number; color: string }

// Barra partida del partido (local, empate, visitante): colores como la tarjeta de
// partido (outcomeColor por índice de orderOutcomes; el Empate va neutro) y anchos
// normalizados a 100. null si no se puede afirmar quién es local.
export function segmentosPartido(m: Market): Segmento[] | null {
  const match = matchOutcomes(m)
  if (!match) return null
  const orden = orderOutcomes(m.outcomes ?? [])
  const lados = [match.local, match.empate, match.visitante].filter((o): o is NonNullable<typeof o> => !!o)
  const total = lados.reduce((s, o) => s + o.price, 0) || 1
  return lados.map(o => ({
    key: o.outcome_key,
    label: cleanLabel(o.label),
    price: o.price,
    pct: (o.price / total) * 100,
    color: o.outcome_key === 'empate' ? 'var(--border-default)' : outcomeColor(orden.findIndex(x => x.outcome_key === o.outcome_key)),
  }))
}

// Marcador de la jornada (panel de Deportes): un tablero por partido con escudos, hora o
// marcador en vivo y la barra de probabilidades. Sin botones: todo el tablero abre el mercado.
export function Marcador({ markets, activeDia, onDiaChange, live, className = '' }: {
  markets: Market[]
  activeDia: string | null
  onDiaChange: (dia: string | null) => void
  live?: Record<string, LiveState>
  className?: string
}) {
  const { t } = useTranslation()
  const partidos = useMemo(() => markets.filter(m => m.kind === 'partido' && segmentosPartido(m)), [markets])
  const groups = useMemo(() => agruparPorDia(partidos), [partidos])
  if (groups.length === 0) return null
  const current = groups.find(g => g.key === activeDia) ?? groups[0]

  return (
    <section className={className} style={{ marginBottom: 28 }}>
      <div className="tabs-line" style={{ marginBottom: 14 }}>
        <Tabs<string>
          items={groups.map(g => ({ key: g.key, label: diaLabel(g.key), count: g.items.length }))}
          active={current.key}
          onChange={onDiaChange}
          ariaLabel={t('deportes.jornada')}
        />
      </div>
      <div className="marcador-grid">
        {current.items.map(m => {
          const segs = segmentosPartido(m)!
          const lv = live?.[m.id]
          const enJuego = lv?.estado === 'LIVE' || lv?.estado === 'FT' || lv?.estado === 'AET'
          const equipos = [segs[0], segs[segs.length - 1]]
          const goles = [lv?.marcadorLocal, lv?.marcadorVisitante]
          return (
            <Link key={m.id} to={`/mercado/${m.id}`} className="card marcador-card">
              <div className="meta-label marcador-head">
                <span>{m.subcategory}</span>
                {lv?.estado === 'LIVE' ? (
                  <span style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="live-dot" />{lv.reloj ?? t('common.live')}</span>
                ) : (
                  <span className="num">{m.status === 'pending_resolution' ? t('deportes.finished') : `${horaCdmx(eventAt(m))} · ${diaCortoCdmx(eventAt(m))}`}</span>
                )}
              </div>
              {equipos.map((o, i) => (
                <div key={o.key} className="marcador-team">
                  <TeamMark label={o.label} outcomeKey={o.key} sub={m.subcategory} marketId={m.id} size={22} />
                  <span className="marcador-team-name">{o.label}</span>
                  {enJuego && <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{goles[i] ?? '–'}</span>}
                </div>
              ))}
              <div className="marcador-bar" aria-hidden>
                {segs.map(s => <span key={s.key} style={{ width: `${s.pct}%`, background: s.color }} />)}
              </div>
              <div className="marcador-pcts num">
                {segs.map(s => (
                  <span key={s.key} title={s.label}>{s.key === 'empate' && `${t('deportes.draw')} `}{probText(s.price, m.status)}</span>
                ))}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
