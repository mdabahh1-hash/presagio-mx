import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MarketRow } from './MarketRow'
import { SPORT_GROUPS, sportOfSub } from '../lib/categories'
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

// Dentro de cada sección: cierre más próximo primero, pendientes al final.
function byClosing(a: Market, b: Market): number {
  const pa = a.status === 'pending_resolution' ? 1 : 0
  const pb = b.status === 'pending_resolution' ? 1 : 0
  if (pa !== pb) return pa - pb
  return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
}

interface CategoryBrowseProps {
  category: Category
  markets: Market[]
  loading: boolean
  // Subcategorías a listar en el rail (solo categorías que las tienen).
  subcats?: string[]
  // Controlado (Markets sincroniza con ?sport= y ?sub=). Sin onChange, el estado es interno (Home).
  activeSub?: string | null
  onSubChange?: (sub: string | null) => void
  activeSport?: string | null
  onSportChange?: (sport: string | null) => void
}

function RailButton({ active, label, count, onClick, nested = false }: {
  active: boolean
  label: string
  count: number
  onClick: () => void
  nested?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`cat-rail-item${nested ? ' cat-rail-sub' : ''}`}
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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
      <h3 className="font-display" style={{
        margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h3>
      <span className="font-mono" style={{
        fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        borderRadius: 99, padding: '1px 8px',
      }}>
        {count}
      </span>
    </div>
  )
}

export function CategoryBrowse({
  category, markets, loading, subcats,
  activeSub, onSubChange, activeSport, onSportChange,
}: CategoryBrowseProps) {
  const { t } = useTranslation()
  const isSports = category === 'Deportes'
  const [bucket, setBucket] = useState<BucketKey>('all')
  // Fallback no controlado (Home no sincroniza con la URL)
  const [innerSub, setInnerSub] = useState<string | null>(null)
  const [innerSport, setInnerSport] = useState<string | null>(null)
  const sub = onSubChange ? (activeSub ?? null) : innerSub
  const setSub = onSubChange ?? setInnerSub
  const sportState = onSportChange ? (activeSport ?? null) : innerSport
  const setSport = onSportChange ?? setInnerSport
  // Una liga activa implica su deporte (deep links viejos ?sub=Liga MX siguen funcionando)
  const sport = isSports ? ((sub && sportOfSub(sub)) || sportState) : null

  useEffect(() => {
    setInnerSub(null)
    setInnerSport(null)
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

  // Deporte → ligas visibles. Ligas presentes en datos pero fuera de SPORT_GROUPS
  // se muestran como deporte propio (fallback).
  const sportTree = useMemo(() => {
    if (!isSports) return []
    const tree: { sport: string; leagues: string[]; count: number }[] = []
    const grouped = new Set<string>()
    for (const [s, leagues] of Object.entries(SPORT_GROUPS)) {
      const vis = leagues.filter(l => (subCounts[l] ?? 0) > 0)
      leagues.forEach(l => grouped.add(l))
      if (vis.length > 0) tree.push({ sport: s, leagues: vis, count: vis.reduce((n, l) => n + (subCounts[l] ?? 0), 0) })
    }
    for (const s of visibleSubcats) {
      if (!grouped.has(s)) tree.push({ sport: s, leagues: [s], count: subCounts[s] ?? 0 })
    }
    return tree
  }, [isSports, subCounts, visibleSubcats])

  const sportLeagues = useMemo(
    () => (sport ? (SPORT_GROUPS[sport] ?? [sport]) : null),
    [sport],
  )

  const inSub = useMemo(() => {
    if (sub) return inCat.filter(m => m.subcategory === sub)
    if (sportLeagues) return inCat.filter(m => m.subcategory && sportLeagues.includes(m.subcategory))
    return inCat
  }, [inCat, sub, sportLeagues])

  const counts = useMemo(() => {
    const c: Record<BucketKey, number> = { all: inSub.length, now: 0, today: 0, week: 0, month: 0, later: 0, pending: 0 }
    for (const m of inSub) c[bucketOf(m)]++
    return c
  }, [inSub])

  const shown = useMemo(
    () => (bucket === 'all' ? inSub : inSub.filter(m => bucketOf(m) === bucket)),
    [inSub, bucket],
  )

  // Secciones por subcategoría en orden de display; sin subcategoría al final ("Otros").
  // Categorías sin subcategorías: una sola lista sin encabezado.
  const sections = useMemo(() => {
    const order = sportLeagues ?? subcats ?? []
    if (order.length === 0) return [{ title: null as string | null, items: [...shown].sort(byClosing) }]
    const byKey = new Map<string | null, Market[]>()
    for (const m of shown) {
      const key = m.subcategory && order.includes(m.subcategory) ? m.subcategory : null
      byKey.set(key, [...(byKey.get(key) ?? []), m])
    }
    const out: { title: string | null; items: Market[] }[] = []
    for (const s of order) {
      const items = byKey.get(s)
      if (items?.length) out.push({ title: s, items: items.sort(byClosing) })
    }
    const rest = byKey.get(null)
    if (rest?.length) out.push({ title: t('categoryBrowse.otherSection'), items: rest.sort(byClosing) })
    return out
  }, [shown, sportLeagues, subcats, t])

  const selectSport = (s: string | null) => {
    setSub(null)
    setSport(s)
  }
  const selectSub = (s: string | null) => {
    if (s && isSports) setSport(sportOfSub(s) ?? s)
    setSub(s)
  }

  if (loading) {
    return (
      <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="skeleton" style={{ height: 280 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
      </div>
    )
  }

  // "Deportes · Fútbol · Liga MX"; no repetir cuando deporte y liga coinciden (F1, Boxeo)
  const headParts = [category, sport, sub && sub !== sport ? sub : null].filter((p): p is string => !!p)

  return (
    <div className="cat-browse" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start', marginBottom: 48 }}>
      {/* Left rail */}
      <div className="cat-rail">
        {isSports && sportTree.length > 0 && (
          <>
            <RailHeader>{t('categoryBrowse.allSports')}</RailHeader>
            <RailButton
              active={!sport && !sub}
              label={t('categoryBrowse.subcatAll')}
              count={inCat.length}
              onClick={() => selectSport(null)}
            />
            {sportTree.map(node => (
              <React.Fragment key={node.sport}>
                <RailButton
                  active={sport === node.sport && !sub}
                  label={node.sport}
                  count={node.count}
                  onClick={() => selectSport(sport === node.sport ? null : node.sport)}
                />
                {sport === node.sport && node.leagues.length > 1 && node.leagues.map(l => (
                  <RailButton
                    key={l}
                    nested
                    active={sub === l}
                    label={l}
                    count={subCounts[l] ?? 0}
                    onClick={() => selectSub(sub === l ? null : l)}
                  />
                ))}
              </React.Fragment>
            ))}
            <div className="cat-rail-divider" style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 8px' }} />
            <RailHeader>{t('categoryBrowse.railClosing')}</RailHeader>
          </>
        )}
        {!isSports && visibleSubcats.length > 0 && (
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
            <div className="cat-rail-divider" style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 8px' }} />
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
      <div style={{ minWidth: 0 }}>
        <div className="cat-browse-head" style={{ marginBottom: 18 }}>
          <div className="exchange-header" style={{ margin: 0 }}>
            {headParts.join(' · ')} · {t('categoryBrowse.marketCount', { count: shown.length })}
          </div>
        </div>

        {shown.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {sections.map(sec => (
              <section key={sec.title ?? '__all'}>
                {sec.title && <SectionHeader title={sec.title} count={sec.items.length} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sec.items.map(m => (
                    <MarketRow key={m.id} market={m} hideSubcategory={!!sec.title && sec.title === m.subcategory} />
                  ))}
                </div>
              </section>
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
