import React, { useMemo, useState } from 'react'
import { MarketCard } from './MarketCard'
import type { Category, Market } from '../types'

type BucketKey = 'all' | 'now' | 'today' | 'week' | 'month' | 'later'

const BUCKETS: { key: BucketKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'now', label: 'Cierran ya' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'later', label: 'Más adelante' },
]

// Bucket a market by hours-until-close (future-proof: minute/hour markets land in "now").
function bucketOf(endsAt: string): Exclude<BucketKey, 'all'> {
  const h = (new Date(endsAt).getTime() - Date.now()) / 3_600_000
  if (h <= 1) return 'now'
  if (h <= 24) return 'today'
  if (h <= 24 * 7) return 'week'
  if (h <= 24 * 30) return 'month'
  return 'later'
}

interface CategoryBrowseProps {
  category: Category
  markets: Market[]
  loading: boolean
}

export function CategoryBrowse({ category, markets, loading }: CategoryBrowseProps) {
  const [bucket, setBucket] = useState<BucketKey>('all')

  const inCat = useMemo(() => markets.filter(m => m.category === category), [markets, category])

  const counts = useMemo(() => {
    const c: Record<BucketKey, number> = { all: inCat.length, now: 0, today: 0, week: 0, month: 0, later: 0 }
    for (const m of inCat) c[bucketOf(m.endsAt)]++
    return c
  }, [inCat])

  const shown = useMemo(() => {
    const list = bucket === 'all' ? inCat : inCat.filter(m => bucketOf(m.endsAt) === bucket)
    return [...list].sort((a, b) => b.volume - a.volume)
  }, [inCat, bucket])

  if (loading) {
    return (
      <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ height: 280, animation: 'livePulse 1.8s ease infinite' }} />
        <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, height: 210 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start', marginBottom: 48 }}>
      {/* Left rail */}
      <div className="cat-rail">
        {BUCKETS.map(b => {
          const active = b.key === bucket
          return (
            <button
              key={b.key}
              onClick={() => setBucket(b.key)}
              className="cat-rail-item"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '11px 14px', borderRadius: 10,
                border: `1px solid ${active ? 'rgba(255,215,0,0.25)' : 'transparent'}`,
                background: active ? 'rgba(255,215,0,0.08)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.86rem',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <span>{b.label}</span>
              <span className="font-mono" style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: active ? 'var(--gold)' : 'var(--text-tertiary)',
                background: active ? 'rgba(255,215,0,0.12)' : 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99, padding: '1px 8px', minWidth: 22, textAlign: 'center',
              }}>
                {counts[b.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div>
        <div className="cat-browse-head" style={{ marginBottom: 18 }}>
          <div className="exchange-header" style={{ margin: 0 }}>
            {category} · {shown.length} mercado{shown.length !== 1 ? 's' : ''}
          </div>
        </div>

        {shown.length > 0 ? (
          <div className="market-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {shown.map((m, i) => (
              <MarketCard key={m.id} market={m} animClass={`anim-${Math.min(i + 1, 6)}`} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <p style={{ fontWeight: 600 }}>Sin mercados en este filtro</p>
          </div>
        )}
      </div>
    </div>
  )
}
