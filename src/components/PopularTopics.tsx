import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../types'
import { formatVolume } from '../lib/format'
import { MarketThumb } from './MarketThumb'

// "Temas populares" — real data: the markets with the most actual betting volume.
// Reuses the markets already loaded on Home (no extra request). Falls back to
// trending markets if nothing has volume yet, so it's never empty.
// 6 filas llenan exactos los 420px que comparte con el hero en desktop; 7 no caben.
const TOP_N = 6

export function PopularTopics({ markets }: { markets: Market[] }) {
  const { t } = useTranslation()
  const top = (() => {
    const withVol = markets.filter(m => m.volume > 0).sort((a, b) => b.volume - a.volume)
    if (withVol.length >= 3) return withVol.slice(0, TOP_N)
    // Low activity → rank by trending first, then volume, so the widget still shows something.
    return [...markets]
      .sort((a, b) => Number(b.trending) - Number(a.trending) || b.volume - a.volume)
      .slice(0, TOP_N)
  })()

  if (top.length === 0) return null

  return (
    <div className="card popular-card" style={{ padding: '16px 16px 8px' }}>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: 6 }}>{t('popular.title')}</h3>
      <div className="popular-list" style={{ display: 'flex', flexDirection: 'column' }}>
        {top.map((m, i) => (
          <Link key={m.id} to={`/mercado/${m.id}`} className="list-row is-link popular-row" style={{ padding: '10px 4px', gap: 10 }}>
            <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', width: 14, flexShrink: 0, textAlign: 'center' }}>
              {i + 1}
            </span>
            <MarketThumb market={m} size={32} radius={6} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.question}
              </div>
            </div>
            <span className="meta-label num" style={{ flexShrink: 0 }}>
              {m.volume > 0 ? `${formatVolume(m.volume)} PT` : t('popular.trending')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
