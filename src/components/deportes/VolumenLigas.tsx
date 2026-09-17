import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiResumenCategoria } from '../../lib/api'
import { LeagueMark } from './LeagueMark'
import { formatVolume } from '../../lib/format'

const MAX_ROWS = 6

const MIN_LIGAS_7D = 3

// Volumen por liga (GET /markets/resumen). Ventana de 7 días cuando al menos tres ligas
// operaron en la semana (la comparación tiene sentido); si no, el acumulado con etiqueta
// "Total". Nunca una tarjeta de ceros ni de una sola barra.
export function VolumenLigas({ resumen }: { resumen: ApiResumenCategoria }) {
  const { t } = useTranslation()
  const use7d = resumen.subcategorias.filter(s => s.volumen_7d > 0).length >= MIN_LIGAS_7D
  const rows = resumen.subcategorias
    .map(s => ({ sub: s.subcategory, v: use7d ? s.volumen_7d : s.volumen_total }))
    .filter(r => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, MAX_ROWS)
  if (rows.length === 0) return null
  const max = rows[0].v
  const total = use7d ? resumen.volumen_7d : resumen.volumen_total

  return (
    <div className="card" style={{ padding: '16px 18px 10px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <h3 className="section-title">{t('deportes.volumeByLeague')}</h3>
        <span className="meta-label">{use7d ? t('deportes.window7d') : t('deportes.windowTotal')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <div key={r.sub} className="list-row" style={{ padding: '9px 0', gap: 10 }}>
            <LeagueMark sub={r.sub} size={20} radius={5} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>
            <span className="dep-bar" style={{ width: 72 }}>
              <span className={i === 0 ? 'lead' : ''} style={{ width: `${Math.max(2, Math.round((r.v / max) * 100))}%` }} />
            </span>
            <span className="num" style={{ width: 56, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{formatVolume(r.v)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: '12px 0 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="meta-label">{t('deportes.totalSports')}</span>
        <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{formatVolume(total)} PT</span>
      </div>
    </div>
  )
}
