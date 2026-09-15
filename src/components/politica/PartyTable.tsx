import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiBloque, ApiPartido } from '../../lib/api'
import { getPartyColor, getPartyTextColor } from '../../lib/partyColors'

interface PartyTableProps {
  bloques: ApiBloque[]
  total: number
  partidos: ApiPartido[]
  className?: string
}

// Tabla de partidos: ficha con siglas (placeholder de logo), nombre, barra y
// porcentaje de escaños derivado de la misma proyección que la barra.
export function PartyTable({ bloques, total, partidos, className = '' }: PartyTableProps) {
  const { t } = useTranslation()
  const rows = [...bloques].sort((a, b) => b.escanos - a.escanos)
  return (
    <div className={`card ${className}`} style={{ padding: '18px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 className="section-title" style={{ fontSize: 16 }}>{t('politica.parties')}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(b => {
          const p = partidos.find(x => x.clave === b.partido)
          const pct = (b.escanos / total) * 100
          return (
            <div key={b.partido} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: getPartyColor(b.partido), color: getPartyTextColor(b.partido),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              }}>
                {p?.siglas ?? b.partido}
              </div>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p?.nombre ?? b.partido}
              </span>
              <div className="pol-party-track">
                <div style={{ width: `${pct}%`, height: '100%', background: getPartyColor(b.partido) }} />
              </div>
              <span className="num" style={{ width: 46, textAlign: 'right', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
