import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MarketCard } from './MarketCard'
import type { Category, Market } from '../types'

type BucketKey = 'all' | 'now' | 'today' | 'week' | 'month' | 'later' | 'pending'

const BUCKET_KEYS: BucketKey[] = ['all', 'now', 'today', 'week', 'month', 'later', 'pending']

// Bucket a market by hours-until-close (future-proof: minute/hour markets land
// in "now"). Expired-but-unresolved markets get their own terminal bucket so
// they don't inflate "Cierran ya" (their ends_at is already in the past).
function bucketOf(m: Market): Exclude<BucketKey, 'all'> {
  if (m.status === 'pending_resolution') return 'pending'
  const h = (new Date(m.endsAt).getTime() - Date.now()) / 3_600_000
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
  // Subcategorías a listar en el rail (solo categorías que las tienen).
  subcats?: string[]
  // Controlado (Markets sincroniza con ?sub=). Sin onSubChange, el estado es interno (Home).
  activeSub?: string | null
  onSubChange?: (sub: string | null) => void
}

function RailButton({ active, label, count, onClick }: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="cat-rail-item"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '11px 14px', borderRadius: 10,
        border: `1px solid ${active ? 'var(--oro-glow)' : 'transparent'}`,
        background: active ? 'var(--oro-dim)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.86rem',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span className="font-mono" style={{
        fontSize: '0.72rem', fontWeight: 700,
        color: active ? 'var(--gold)' : 'var(--text-tertiary)',
        background: active ? 'var(--oro-dim)' : 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 99, padding: '1px 8px', minWidth: 22, textAlign: 'center',
      }}>
        {count}
      </span>
    </button>
  )
}

function RailHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="cat-rail-header" style={{
      fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
      padding: '6px 14px 4px', fontFamily: 'DM Sans',
    }}>
      {children}
    </div>
  )
}

export function CategoryBrowse({ category, markets, loading, subcats, activeSub, onSubChange }: CategoryBrowseProps) {
  const { t } = useTranslation()
  const [bucket, setBucket] = useState<BucketKey>('all')
  // Fallback no controlado (Home no sincroniza la subcategoría con la URL)
  const [innerSub, setInnerSub] = useState<string | null>(null)
  const sub = onSubChange ? (activeSub ?? null) : innerSub
  const setSub = onSubChange ?? setInnerSub

  useEffect(() => {
    setInnerSub(null)
    setBucket('all')
  }, [category])

  const bucketLabels: Record<BucketKey, string> = {
    all: t('categoryBrowse.bucketAll'),
    now: t('categoryBrowse.bucketNow'),
    today: t('categoryBrowse.bucketToday'),
    week: t('categoryBrowse.bucketWeek'),
    month: t('categoryBrowse.bucketMonth'),
    later: t('categoryBrowse.bucketLater'),
    pending: t('categoryBrowse.bucketPending'),
  }

  const inCat = useMemo(() => markets.filter(m => m.category === category), [markets, category])

  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of inCat) if (m.subcategory) c[m.subcategory] = (c[m.subcategory] ?? 0) + 1
    return c
  }, [inCat])

  // Solo subcategorías con mercados cargados (evita filas en 0)
  const visibleSubcats = useMemo(
    () => (subcats ?? []).filter(s => (subCounts[s] ?? 0) > 0),
    [subcats, subCounts],
  )

  const inSub = useMemo(
    () => (sub ? inCat.filter(m => m.subcategory === sub) : inCat),
    [inCat, sub],
  )

  const counts = useMemo(() => {
    const c: Record<BucketKey, number> = { all: inSub.length, now: 0, today: 0, week: 0, month: 0, later: 0, pending: 0 }
    for (const m of inSub) c[bucketOf(m)]++
    return c
  }, [inSub])

  const shown = useMemo(() => {
    const list = bucket === 'all' ? inSub : inSub.filter(m => bucketOf(m) === bucket)
    return [...list].sort((a, b) => b.volume - a.volume)
  }, [inSub, bucket])

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
        {visibleSubcats.length > 0 && (
          <>
            <RailHeader>{t('categoryBrowse.railSubcats')}</RailHeader>
            <RailButton
              active={sub === null}
              label={t('categoryBrowse.subcatAll')}
              count={inCat.length}
              onClick={() => setSub(null)}
            />
            {visibleSubcats.map(s => (
              <RailButton
                key={s}
                active={sub === s}
                label={s}
                count={subCounts[s] ?? 0}
                onClick={() => setSub(sub === s ? null : s)}
              />
            ))}
            <div className="cat-rail-divider" style={{
              height: 1, background: 'var(--border-subtle)', margin: '10px 8px',
            }} />
            <RailHeader>{t('categoryBrowse.railClosing')}</RailHeader>
          </>
        )}
        {BUCKET_KEYS.filter(key => key !== 'pending' || counts.pending > 0).map(key => (
          <RailButton
            key={key}
            active={key === bucket}
            label={bucketLabels[key]}
            count={counts[key]}
            onClick={() => setBucket(key)}
          />
        ))}
      </div>

      {/* Content */}
      <div>
        <div className="cat-browse-head" style={{ marginBottom: 18 }}>
          <div className="exchange-header" style={{ margin: 0 }}>
            {category}{sub ? ` · ${sub}` : ''} · {t('categoryBrowse.marketCount', { count: shown.length })}
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
            <p style={{ fontWeight: 600 }}>{t('categoryBrowse.emptyFilter')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
