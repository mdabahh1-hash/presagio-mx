import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiProyeccion, ApiPartido } from '../../lib/api'
import type { SeatProjectionResult } from '../../lib/seatProjection'
import { getPartyColor, getPartyTextColor } from '../../lib/partyColors'
import { probColor, probText } from '../../lib/prices'
import { useElementWidth } from '../../lib/useElementWidth'

interface SeatProjectionProps {
  proyeccion: ApiProyeccion
  partidos: ApiPartido[]
  // Esperados calculados con los precios vivos (lib/seatProjection.ts)
  projection: SeatProjectionResult
  // yes_price vivo del mercado del umbral (proyeccion.mercado_umbral_id); null si no está en la lista
  thresholdProb: number | null
  className?: string
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div>
      <div className="meta-label">{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 600, marginTop: 2, color }}>{value}</div>
    </div>
  )
}

// Barra de escaños esperados (Σ precio × punto medio de cada rango, por partido)
// con la marca del umbral y tres cifras al pie. Todo sale de mercados vivos:
// los seis multi de rangos y el binario del umbral.
export function SeatProjection({ proyeccion, partidos, projection, thresholdProb, className = '' }: SeatProjectionProps) {
  const { t } = useTranslation()
  const { titulo, total, umbral, umbral_etiqueta, coalicion, nota } = proyeccion
  const { rows, rest, scale } = projection
  const ficha = (clave: string) => partidos.find(p => p.clave === clave)
  const siglas = (clave: string) => ficha(clave)?.siglas ?? clave
  const seats = (clave: string) => rows.find(r => r.partido === clave)?.seats ?? null
  const withData = rows.filter((r): r is typeof r & { seats: number } => r.seats !== null)
  const blocSeats = coalicion.map(seats)
  const blocTotal = blocSeats.every((s): s is number => s !== null) ? blocSeats.reduce((a, b) => a + b, 0) : null
  const main = coalicion[0]
  const thresholdPct = (umbral / scale) * 100
  const [barRef, barW] = useElementWidth()
  // La etiqueta del segmento solo si cabe: ~5.5 px por carácter a 11 px + aire.
  // Sin medida aún (primer render), regla fija del 6 %.
  const fits = (pct: number, label: string) => (barW ? (pct / 100) * barW >= label.length * 5.5 + 6 : pct >= 6)

  return (
    <div className={`card ${className}`} style={{ padding: '18px 20px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 className="section-title" style={{ fontSize: 16 }}>{titulo}</h3>
        <span className="meta-label num">{t('politica.seats', { count: total })}</span>
      </div>

      <div className="pol-seatbar" ref={barRef}>
        {withData.map(r => {
          const pct = (r.seats / scale) * 100
          const label = `${siglas(r.partido)} ${r.seats}`
          return (
            <div
              key={r.partido}
              title={`${ficha(r.partido)?.nombre ?? r.partido} · ${r.seats}`}
              style={{
                width: `${pct}%`, background: getPartyColor(r.partido), color: getPartyTextColor(r.partido),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden',
              }}
            >
              {fits(pct, label) && <span className="num">{label}</span>}
            </div>
          )
        })}
        {rest > 0 && <div style={{ width: `${(rest / scale) * 100}%` }} />}
      </div>

      {/* Marca del umbral */}
      <div style={{ position: 'relative', height: 16, marginBottom: 12 }}>
        <div style={{ position: 'absolute', left: `${thresholdPct}%`, top: 0, bottom: 0, width: 1, background: 'var(--text-tertiary)' }} />
        <div
          className="num"
          style={{
            position: 'absolute', top: 0, left: `calc(${thresholdPct}% + 6px)`, maxWidth: `calc(${100 - thresholdPct}% - 6px)`,
            fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {umbral} · {umbral_etiqueta}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        {/* Siglas de la coalición: identificadores, no se traducen */}
        <Stat label={coalicion.map(siglas).join(' + ')} value={blocTotal ?? '—'} />
        {main && <Stat label={t('politica.partyAlone', { party: ficha(main)?.nombre ?? main })} value={seats(main) ?? '—'} />}
        <Stat
          label={t('politica.thresholdProb', { count: umbral })}
          value={thresholdProb !== null ? probText(thresholdProb) : '—'}
          color={thresholdProb !== null ? probColor(thresholdProb) : undefined}
        />
      </div>
      {nota && <p className="meta-label" style={{ margin: '12px 0 0', lineHeight: 1.4 }}>{nota}</p>}
    </div>
  )
}
