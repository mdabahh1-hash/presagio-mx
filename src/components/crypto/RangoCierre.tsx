import React from 'react'
import { probText } from '../../lib/prices'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { topOutcome } from '../../lib/seatProjection'

// Orden de los rangos: la API los da por precio; la key sembrada lleva el límite inferior
// (r_menos_N primero, r_N_M por N, r_N_mas al final). Sin número, se conserva el orden.
function limiteInferior(key: string): number {
  if (key.startsWith('r_menos_')) return -Infinity
  const n = /^r_(\d+)/.exec(key)
  return n ? Number(n[1]) : NaN
}

// Rango de cierre: el multi real del activo. Barras neutras (verde/rojo es solo del Sí).
export function RangoCierre({ market, sub, className = '' }: { market: Market; sub: string; className?: string }) {
  const { t } = useTranslation()
  const lider = topOutcome(market)
  return (
    <section className={`card ${className}`} style={{ padding: '16px 18px', minWidth: 0 }}>
      <Link to={`/mercado/${market.id}`} style={{ color: 'inherit' }}>
        <h2 className="section-title">{t('crypto.rangeTitle', { sub })}</h2>
      </Link>
      <p className="meta-label" style={{ margin: '2px 0 12px' }}>{t('crypto.rangeSub')}</p>
      {[...(market.outcomes ?? [])].sort((a, b) => (limiteInferior(a.outcome_key) - limiteInferior(b.outcome_key)) || 0).map(o => {
        const lead = o.outcome_key === lider?.outcome_key
        return (
          <div key={o.outcome_key} style={{ display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr) 48px', gap: 12, alignItems: 'center', padding: '6px 0' }}>
            <span className="num" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{o.label}</span>
            <div className="prob-bar-track" style={{ height: 10, borderRadius: 5 }}>
              <div style={{ width: `${o.price}%`, height: '100%', borderRadius: 5, background: lead ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
            </div>
            <span className="num" style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: lead ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{probText(o.price)}</span>
          </div>
        )
      })}
    </section>
  )
}
