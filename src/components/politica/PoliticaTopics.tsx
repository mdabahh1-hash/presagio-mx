import React from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../Icon'

export interface TopicRow {
  // Subcategoría (identificador de API/URL, no se traduce); null = sin subcategoría ("Otros")
  sub: string | null
  count: number
}

export interface SourceRow {
  host: string
  label: string
  // Primera URL real vista con ese host (el enlace), no el host a secas
  url: string
  count: number
}

interface PoliticaTopicsProps {
  total: number
  topics: TopicRow[]
  activeSub: string | null
  onSelect: (sub: string | null) => void
  sources: SourceRow[]
}

// Columna derecha del hero: temas (subcategorías con conteo, escriben ?sub=)
// y las fuentes oficiales que citan los mercados de la categoría.
export function PoliticaTopics({ total, topics, activeSub, onSelect, sources }: PoliticaTopicsProps) {
  const { t } = useTranslation()
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <h3 className="section-title" style={{ fontSize: 16 }}>{t('politica.topics')}</h3>
        {activeSub && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="meta-label"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {t('politica.topicsViewAll')}
          </button>
        )}
      </div>

      <button type="button" className={`pol-topic${activeSub === null ? ' active' : ''}`} onClick={() => onSelect(null)}>
        <span>{t('politica.topicsAll')}</span>
        <span className="num meta-label">{total}</span>
      </button>
      {topics.map(tp => tp.sub === null ? (
        // Sin subcategoría no hay identificador de URL: fila de conteo, no filtro
        <div key="__otros" className="pol-topic" style={{ cursor: 'default' }}>
          <span>{t('categoryBrowse.otherSection')}</span>
          <span className="num meta-label">{tp.count}</span>
        </div>
      ) : (
        <button
          key={tp.sub}
          type="button"
          className={`pol-topic${activeSub === tp.sub ? ' active' : ''}`}
          onClick={() => onSelect(activeSub === tp.sub ? null : tp.sub)}
        >
          <span>{tp.sub}</span>
          <span className="num meta-label">{tp.count}</span>
        </button>
      ))}

      {sources.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <div className="meta-label" style={{ marginBottom: 6 }}>{t('politica.sources')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sources.map(s => (
              <a
                key={s.host}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', minWidth: 0 }}
              >
                <Icon name="external" size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                <span className="num meta-label">{s.count}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
