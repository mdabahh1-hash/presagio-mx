import React from 'react'
import { Link } from 'react-router-dom'
import type { Market } from '../types'

// "Temas populares" — real data: the markets with the most actual betting volume.
// Reuses the markets already loaded on Home (no extra request). Falls back to
// trending markets if nothing has volume yet, so it's never empty.
function fmtVol(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return `${Math.round(v)}`
}

export function PopularTopics({ markets }: { markets: Market[] }) {
  const top = (() => {
    const withVol = markets.filter(m => m.volume > 0).sort((a, b) => b.volume - a.volume)
    if (withVol.length >= 3) return withVol.slice(0, 7)
    // Low activity → rank by trending first, then volume, so the widget still shows something.
    return [...markets]
      .sort((a, b) => Number(b.trending) - Number(a.trending) || b.volume - a.volume)
      .slice(0, 7)
  })()

  if (top.length === 0) return null

  return (
    <div className="card" style={{ padding: '18px 18px 10px' }}>
      <div className="exchange-header" style={{ marginBottom: 14 }}>Temas populares</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {top.map((m, i) => (
          <Link
            key={m.id}
            to={`/mercado/${m.id}`}
            className="popular-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              textDecoration: 'none', padding: '12px 8px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
            }}
          >
            <span className="font-mono" style={{
              fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-tertiary)',
              width: 16, flexShrink: 0, textAlign: 'center',
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)',
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {m.question}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'DM Mono', marginTop: 2 }}>
                {m.volume > 0 ? `${fmtVol(m.volume)} PT en volumen` : 'En tendencia'}
              </div>
            </div>
            <span style={{ fontSize: '1rem', flexShrink: 0 }} aria-hidden>🔥</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
