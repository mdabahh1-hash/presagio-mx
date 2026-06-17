import React from 'react'
import { Link } from 'react-router-dom'

// Trending search topics — what people are searching right now.
// Curated list (edit freely): { topic, searches, query }
const TRENDING = [
  { topic: 'Mundial 2026', searches: '2.4M', query: 'Mundial 2026' },
  { topic: 'Selección Mexicana', searches: '1.8M', query: 'México' },
  { topic: 'Claudia Sheinbaum', searches: '1.1M', query: 'Sheinbaum' },
  { topic: 'Dólar / Peso', searches: '890K', query: 'dólar' },
  { topic: 'Elecciones 2027', searches: '540K', query: 'elecciones' },
  { topic: 'Liga MX', searches: '410K', query: 'Liga MX' },
  { topic: 'Bitcoin', searches: '320K', query: 'bitcoin' },
]

export function PopularTopics() {
  return (
    <div className="card" style={{ padding: '18px 18px 10px' }}>
      <div className="exchange-header" style={{ marginBottom: 14 }}>Temas populares</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TRENDING.map((t, i) => (
          <Link
            key={t.topic}
            to={`/mercados?q=${encodeURIComponent(t.query)}`}
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
                {t.topic}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'DM Mono', marginTop: 2 }}>
                {t.searches} búsquedas
              </div>
            </div>
            <span style={{ fontSize: '1rem', flexShrink: 0 }} aria-hidden>🔥</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
