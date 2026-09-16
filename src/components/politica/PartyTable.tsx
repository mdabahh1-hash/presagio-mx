import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ApiPartido } from '../../lib/api'
import type { SeatRow } from '../../lib/seatProjection'
import { getPartyColor, getPartyTextColor } from '../../lib/partyColors'

interface PartyTableProps {
  rows: SeatRow[]
  total: number
  partidos: ApiPartido[]
  className?: string
}

// Tabla de partidos: cada fila es un enlace al mercado de rangos del partido
// (el porqué de la cifra), con el rango más probable y su precio, la barra de
// escaños esperados sobre el total y el esperado en número.
export function PartyTable({ rows, total, partidos, className = '' }: PartyTableProps) {
  const { t } = useTranslation()
  const shown = rows
    .filter((r): r is SeatRow & { seats: number } => r.seats !== null)
    .sort((a, b) => b.seats - a.seats)
  if (shown.length === 0) return null
  return (
    <div className={`card ${className}`} style={{ padding: '18px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <h3 className="section-title" style={{ fontSize: 16 }}>{t('politica.parties')}</h3>
        <span className="meta-label">{t('politica.expectedSeats')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {shown.map(r => {
          const p = partidos.find(x => x.clave === r.partido)
          const pct = Math.min(100, (r.seats / total) * 100)
          return (
            <Link key={r.partido} to={`/mercado/${r.mercadoId}`} className="pol-party-row">
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: getPartyColor(r.partido), color: getPartyTextColor(r.partido),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              }}>
                {p?.siglas ?? r.partido}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="pol-party-name" style={{ fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p?.nombre ?? r.partido}
                </span>
                {r.top && (
                  <span className="meta-label num" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.top.label} · {Math.round(r.top.price)}%
                  </span>
                )}
              </div>
              <div className="pol-party-track">
                <div style={{ width: `${pct}%`, height: '100%', background: getPartyColor(r.partido) }} />
              </div>
              <span className="num" style={{ width: 46, textAlign: 'right', fontSize: 13, fontWeight: 600, flexShrink: 0, color: 'var(--text-primary)' }}>
                {r.seats}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
