import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { TeamMark } from '../TeamMark'
import { Icon } from '../Icon'
import { formatDate } from '../../lib/format'

const MAX_ROWS = 6

// "Probabilidad de título": precios vivos del multi de campeón de la liga
// (contenido.titulos). Nada estimado: cada fila es una opción del mercado.
// `compact`: columna lateral de 320 px (vista de liga): título corto y barra de 72 px
export function TituloTable({ market, liga, compact = false }: { market: Market; liga: string; compact?: boolean }) {
  const { t } = useTranslation()
  const outs = [...(market.outcomes ?? [])].sort((a, b) => b.price - a.price)
  if (outs.length === 0) return null
  const rows = outs.slice(0, MAX_ROWS)
  const max = rows[0].price || 1

  return (
    <div className="card" style={{ padding: '16px 18px 14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <h3 className="section-title">{compact ? t('deportes.titleShort') : t('deportes.titleProb', { league: liga })}</h3>
        <span className="meta-label num" style={{ whiteSpace: 'nowrap' }}>{t('deportes.closes', { date: formatDate(market.endsAt, { day: 'numeric', month: 'short' }) })}</span>
      </div>
      <p className="meta-label" style={{ margin: '0 0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('deportes.titleSubtitle', { question: market.question })}</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((o, i) => (
          <div key={o.outcome_key} className="list-row" style={{ padding: '10px 0', gap: 12 }}>
            <span className="num meta-label" style={{ width: 16, flexShrink: 0 }}>{i + 1}</span>
            <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={24} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            <span className="dep-bar" style={{ width: compact ? 72 : 120 }}>
              <span className={i === 0 ? 'lead' : ''} style={{ width: `${Math.max(2, Math.round((o.price / max) * 100))}%` }} />
            </span>
            <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 14, fontWeight: 600 }}>{Math.round(o.price)}%</span>
          </div>
        ))}
      </div>
      <Link to={`/mercado/${market.id}`} style={{ padding: '12px 0 2px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
        <span>{t('deportes.viewOutcomes', { count: outs.length })}</span>
        <Icon name="arrow-right" size={14} style={{ color: 'var(--text-tertiary)' }} />
      </Link>
    </div>
  )
}
