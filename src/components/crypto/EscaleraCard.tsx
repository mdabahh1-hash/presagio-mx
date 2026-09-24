import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { displayPair, probColor, probText } from '../../lib/prices'
import { formatVolume, formatDate } from '../../lib/format'
import type { Escalera } from './escalera'
import type { Side } from './CryptoExpanded'

// Escalera del mes: binarios del mismo activo y cierre, un nivel por fila (datos del listado).
export function EscaleraCard({ escalera, source, expandedId, onChip, onCollapse, renderExpanded, className = '' }: {
  escalera: Escalera
  source: string | null
  expandedId: string | null
  onChip: (marketId: string, side: Side) => void
  onCollapse: () => void
  renderExpanded: (marketId: string) => React.ReactNode
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const ends = new Date(escalera.endsAt)
  const month = ends.toLocaleDateString(i18n.language, { month: 'long', timeZone: 'America/Mexico_City' })
  const chip: React.CSSProperties = { height: 42, border: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1 }

  return (
    <section className={`card ${className}`} style={{ padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title">{t('crypto.ladderTitle', { month, sub: escalera.sub })}</h2>
          <p className="meta-label" style={{ margin: '2px 0 0' }}>{t('crypto.ladderSub')}</p>
        </div>
        <Badge>
          <span className="num">{formatDate(ends, { day: 'numeric', month: 'short' })}{source ? ` · ${source}` : ''}</span>
        </Badge>
      </div>
      {escalera.peldanos.map(({ market: m, label }) => {
        const pair = displayPair(m.yesPrice)
        const expanded = expandedId === m.id
        return (
          <React.Fragment key={m.id}>
            <div className="list-row crypto-ladder-row" style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) 300px', gap: 14, alignItems: 'center', padding: '10px 0' }}>
              <Link to={`/mercado/${m.id}`} className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</Link>
              <div style={{ minWidth: 0 }}>
                <div className="prob-bar-track" style={{ height: 6 }}>
                  <div style={{ width: `${pair.yes}%`, height: '100%', background: probColor(pair.yes), borderRadius: 3 }} />
                </div>
                <div className="meta-label num" style={{ marginTop: 4 }}>{t('card.vol')} {formatVolume(m.volume)} PT</div>
              </div>
              {expanded ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCollapse} style={{ justifySelf: 'end' }} aria-expanded="true">
                  {t('crypto.trading')}
                  <Icon name="chevron-up" size={14} />
                </button>
              ) : (
                <div className="market-row-outcomes">
                  <button type="button" className="row-outcome-btn price-yes" style={chip} onClick={() => onChip(m.id, 'YES')}>
                    <span className="row-outcome-price">{t('common.yes')} {probText(pair.yes)}</span>
                  </button>
                  <button type="button" className="row-outcome-btn price-no" style={chip} onClick={() => onChip(m.id, 'NO')}>
                    <span className="row-outcome-price">{t('common.no')} {probText(pair.no)}</span>
                  </button>
                </div>
              )}
            </div>
            {expanded && renderExpanded(m.id)}
          </React.Fragment>
        )
      })}
    </section>
  )
}
