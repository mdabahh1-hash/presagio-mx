import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { MarketRow } from '../MarketRow'
import { Icon } from '../Icon'

const MAX_ROWS = 4

// Accesorios de jugador (binarios kind: accesorio abiertos, por cierre) con pista de 2 × 158.
export function AccesoriosCard({ markets, onViewAll }: { markets: Market[]; onViewAll: () => void }) {
  const { t } = useTranslation()
  if (markets.length === 0) return null
  return (
    <div className="card" style={{ padding: '16px 18px 14px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <h3 className="section-title">{t('deportes.props')}</h3>
        <span className="meta-label">{t('deportes.propsByClosing')}</span>
      </div>
      <p className="meta-label" style={{ margin: '0 0 6px' }}>{t('deportes.propsSubtitle')}</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {markets.slice(0, MAX_ROWS).map(m => (
          <MarketRow key={m.id} market={m} fixedTrack trackSlots={2} thumbSize={36} hideBadge padding="11px 0" extraMeta={m.subcategory ?? null} />
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        style={{ width: '100%', padding: '12px 0 2px', borderTop: '1px solid var(--border-subtle)', background: 'none', border: 'none', borderTopStyle: 'solid', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
      >
        <span>{t('deportes.viewProps', { count: markets.length })}</span>
        <Icon name="arrow-right" size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>
    </div>
  )
}
