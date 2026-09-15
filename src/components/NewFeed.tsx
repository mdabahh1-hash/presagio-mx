import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MarketCard, type QuickTradeHandler } from './MarketCard'
import { FilterSelect } from './FilterSelect'
import { Icon } from './Icon'
import { SeeMoreButton } from './SeeMoreButton'
import { selectNewMarkets, byNewest } from '../lib/newMarkets'
import { bucketOf, byClosing } from '../lib/closing'
import type { Market } from '../types'

const PAGE_SIZE = 12

type Sort = 'recent' | 'volume' | 'ending'
type Closing = 'all' | 'today' | 'week' | 'month' | 'later'
type Status = 'open' | 'pending' | 'all'
type Partidos = 'show' | 'hide'

const ALL = '__all__'

const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }

interface Props {
  markets: Market[]
  loading: boolean
  // Móvil: tarjetas compactas con Sí/No que abren la compra sin navegar
  onQuickTrade?: (market: Market) => QuickTradeHandler
  // Móvil: skeletons de tarjeta compacta
  compact?: boolean
}

// Pestaña Nuevo estilo Polymarket: título, píldoras de tema, fila de filtros
// (orden, cierre, estado, ocultar partidos, borrar) y grid. Todo el filtrado es
// en cliente sobre los mercados ya cargados por la Home.
export function NewFeed({ markets, loading, onQuickTrade, compact = false }: Props) {
  const { t } = useTranslation()
  const [tag, setTag] = useState(ALL)
  const [sort, setSort] = useState<Sort>('recent')
  const [closing, setClosing] = useState<Closing>('all')
  const [status, setStatus] = useState<Status>('open')
  const [partidos, setPartidos] = useState<Partidos>('show')
  const [q, setQ] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)

  // Conjunto nuevo: ≤3 días (cualquier estado); si no hay, los 12 más recientes con aviso
  const nuevos = useMemo(() => selectNewMarkets(markets), [markets])

  // Temas presentes: subcategoría o, sin ella, categoría; por número de mercados
  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of nuevos.items) {
      const key = m.subcategory || m.category
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k)
  }, [nuevos.items])

  const term = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    let list = nuevos.items
    if (tag !== ALL) list = list.filter(m => (m.subcategory || m.category) === tag)
    if (status === 'open') list = list.filter(m => m.status !== 'pending_resolution')
    else if (status === 'pending') list = list.filter(m => m.status === 'pending_resolution')
    if (closing !== 'all') {
      list = list.filter(m => {
        const b = bucketOf(m)
        return closing === 'today' ? (b === 'now' || b === 'today') : b === closing
      })
    }
    if (partidos === 'hide') list = list.filter(m => m.kind !== 'partido')
    if (term) list = list.filter(m => m.question.toLowerCase().includes(term))
    const sorted = [...list]
    if (sort === 'volume') sorted.sort((a, b) => b.volume - a.volume)
    else if (sort === 'ending') sorted.sort(byClosing)
    else sorted.sort(byNewest)
    return sorted
  }, [nuevos.items, tag, status, closing, partidos, term, sort])

  useEffect(() => { setVisible(PAGE_SIZE) }, [tag, status, closing, partidos, term, sort])

  const dirty = tag !== ALL || sort !== 'recent' || closing !== 'all' || status !== 'open' || partidos !== 'show' || term !== ''
  const clear = () => {
    setTag(ALL); setSort('recent'); setClosing('all'); setStatus('open'); setPartidos('show'); setQ('')
  }

  const sortOptions = [
    { value: 'recent' as const, label: t('newFeed.sortRecent') },
    { value: 'volume' as const, label: t('newFeed.sortVolume') },
    { value: 'ending' as const, label: t('newFeed.sortEnding') },
  ]
  const closingOptions = [
    { value: 'all' as const, label: t('categoryBrowse.bucketAll') },
    { value: 'today' as const, label: t('categoryBrowse.bucketToday') },
    { value: 'week' as const, label: t('categoryBrowse.bucketWeek') },
    { value: 'month' as const, label: t('categoryBrowse.bucketMonth') },
    { value: 'later' as const, label: t('categoryBrowse.bucketLater') },
  ]
  const statusOptions = [
    { value: 'open' as const, label: t('newFeed.statusOpen') },
    { value: 'pending' as const, label: t('newFeed.statusPending') },
    { value: 'all' as const, label: t('newFeed.statusAll') },
  ]
  const partidosOptions = [
    { value: 'show' as const, label: t('newFeed.showPartidos') },
    { value: 'hide' as const, label: t('newFeed.hidePartidos') },
  ]
  const labelOf = <V extends string>(opts: { value: V; label: string }[], v: V) => opts.find(o => o.value === v)?.label ?? ''

  const iconBtn = (name: 'search' | 'sliders', on: boolean, onClick: () => void, label: string) => (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label} aria-pressed={on} title={label}
      style={{ background: on ? 'var(--bg-hover)' : undefined, color: on ? 'var(--text-primary)' : undefined }}>
      <Icon name={name} size={18} />
    </button>
  )

  return (
    <section style={{ marginBottom: 56 }}>
      {/* Cabecera: título + iconos (buscar, filtros) */}
      <div className="anim-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{t('home.newMarkets')}</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {iconBtn('search', showSearch, () => { setShowSearch(v => !v); if (showSearch) setQ('') }, t('newFeed.search'))}
          {iconBtn('sliders', showFilters, () => setShowFilters(v => !v), t('newFeed.filters'))}
        </div>
      </div>

      {showSearch && (
        <div className="input anim-1" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 12px', maxWidth: 480, marginBottom: 14 }}>
          <Icon name="search" size={16} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={q}
            autoFocus
            onChange={e => setQ(e.target.value)}
            placeholder={t('newFeed.search')}
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={t('common.close')} className="icon-btn" style={{ width: 28, height: 28 }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      )}

      {/* Píldoras de tema */}
      {(loading || tags.length > 0) && (
        <div className="pills anim-2" role="tablist" style={{ marginBottom: 12 }}>
          <button type="button" role="tab" aria-selected={tag === ALL} className={`pill${tag === ALL ? ' active' : ''}`} onClick={() => setTag(ALL)}>
            {t('newFeed.all')}
          </button>
          {tags.map(k => (
            <button key={k} type="button" role="tab" aria-selected={tag === k} className={`pill${tag === k ? ' active' : ''}`} onClick={() => setTag(k)}>
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Fila de filtros */}
      {showFilters && (
        <div className="new-feed-filters anim-2" style={{ marginBottom: 20 }}>
          <FilterSelect icon="sparkle" label={labelOf(sortOptions, sort)} value={sort} options={sortOptions} onChange={setSort} active={sort !== 'recent'} title={t('newFeed.sort')} />
          <FilterSelect label={closing === 'all' ? t('newFeed.closing') : labelOf(closingOptions, closing)} value={closing} options={closingOptions} onChange={setClosing} active={closing !== 'all'} title={t('newFeed.closing')} />
          <FilterSelect label={labelOf(statusOptions, status)} value={status} options={statusOptions} onChange={setStatus} active={status !== 'open'} title={t('newFeed.status')} />
          <FilterSelect label={partidos === 'hide' ? t('newFeed.hidePartidos') : t('newFeed.partidos')} value={partidos} options={partidosOptions} onChange={setPartidos} active={partidos === 'hide'} title={t('newFeed.partidos')} />
          {dirty && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear} style={{ flexShrink: 0, minHeight: 36 }}>
              {t('newFeed.clear')}
            </button>
          )}
        </div>
      )}

      {nuevos.fallback && !loading && (
        <p className="meta-label" style={{ margin: '0 0 16px' }}>{t('home.newFallback')}</p>
      )}

      {/* Grid / lista */}
      {loading ? (
        <div className="market-grid" style={gridStyle}>
          {[...Array(compact ? 5 : 9)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: compact ? 130 : 210 }} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="market-grid anim-3" style={gridStyle}>
            {filtered.slice(0, visible).map((market, i) => (
              <MarketCard
                key={market.id}
                market={market}
                animClass={i < 6 ? `anim-${Math.min(i + 1, 6)}` : ''}
                onQuickTrade={onQuickTrade ? onQuickTrade(market) : undefined}
              />
            ))}
          </div>
          {filtered.length > visible && (
            <SeeMoreButton remaining={filtered.length - visible} onClick={() => setVisible(v => v + PAGE_SIZE)} />
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontWeight: 600, marginBottom: dirty ? 12 : 0 }}>{dirty ? t('home.noNewFiltered') : t('home.noNew')}</p>
          {dirty && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>{t('newFeed.clear')}</button>
          )}
        </div>
      )}
    </section>
  )
}
