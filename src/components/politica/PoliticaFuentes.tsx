import React from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../Icon'

export interface SourceRow {
  host: string
  label: string
  // Primera URL real vista con ese host (el enlace), no el host a secas
  url: string
  count: number
}

// Fuentes oficiales que citan los mercados de la categoría (panel de Política)
export function PoliticaFuentes({ sources }: { sources: SourceRow[] }) {
  const { t } = useTranslation()
  if (sources.length === 0) return null
  return (
    <div className="card" style={{ padding: 18, minWidth: 0, flex: 1 }}>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: 10 }}>{t('politica.sources')}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {sources.map(s => (
          <a
            key={s.host}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', minWidth: 0 }}
          >
            <Icon name="external" size={14} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span className="num meta-label">{s.count}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
