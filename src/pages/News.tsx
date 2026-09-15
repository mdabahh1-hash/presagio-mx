import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMover } from '../lib/api'
import { CATEGORIES } from '../lib/categories'
import { formatDate, formatVolume } from '../lib/format'
import { cleanLabel } from '../lib/mapMarket'
import { CategoryBar } from '../components/CategoryBar'
import { MarketThumb } from '../components/MarketThumb'
import { SparkChart } from '../components/SparkChart'
import { Badge } from '../components/Badge'
import { Icon } from '../components/Icon'
import { SeeMoreButton } from '../components/SeeMoreButton'
import type { Category } from '../types'

const PAGE_SIZE = 20
const HOURS = 24
const HOURS_FALLBACK = 24 * 7

// Ilustración del banner: dos discos con flecha sube/baja y arcos finos.
// Solo tokens del sistema (nada de gradientes ni oro).
function HeroArt() {
  return (
    <svg className="news-hero-art" viewBox="0 0 360 220" width="360" height="220" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <g fill="none" stroke="var(--border-default)" strokeWidth="1">
        <path d="M40 240 C 40 120, 140 60, 260 40" />
        <path d="M80 240 C 80 140, 170 90, 300 70" />
        <path d="M120 240 C 120 160, 200 120, 340 100" />
        <circle cx="250" cy="120" r="90" />
      </g>
      <circle cx="130" cy="130" r="40" fill="var(--bg-elevated)" />
      <g fill="none" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m117 117 26 26" /><path d="M143 121v22h-22" />
      </g>
      <circle cx="250" cy="90" r="40" fill="var(--bg-elevated)" />
      <g fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M237 103 263 77" /><path d="M241 77h22v22" />
      </g>
    </svg>
  )
}

function Change({ value, size = 'md' }: { value: number; size?: 'md' | 'sm' }) {
  const up = value >= 0
  const text = `${up ? '+' : '−'}${Math.abs(Math.round(value))}`
  return (
    <Badge tone={up ? 'green' : 'red'} icon={up ? 'arrow-up-right' : 'arrow-down-right'} style={size === 'md' ? { fontSize: 12 } : undefined}>
      <span className="num">{text}</span>
    </Badge>
  )
}

function MoverRow({ item, rank }: { item: ApiMover; rank: number }) {
  const spark = useMemo(() => item.points.map(p => ({ date: p.recorded_at, price: p.price })), [item.points])
  return (
    <Link to={`/mercado/${item.id}`} className="list-row is-link" style={{ padding: '14px 4px', gap: 14 }}>
      <span className="num" style={{ width: 20, fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)', textAlign: 'center', flexShrink: 0 }}>{rank}</span>
      <MarketThumb market={{ category: item.category as Category, subcategory: item.subcategory ?? null, imageUrl: item.image_url ?? null, id: item.id, question: item.question }} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>{cleanLabel(item.question)}</p>
        {item.outcome_label && (
          <p className="meta-label" style={{ margin: '2px 0 0' }}>{cleanLabel(item.outcome_label)}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span className="num" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            {Math.round(item.price)}%
          </span>
          <Change value={item.change} />
        </div>
      </div>
      <div className="news-spark" style={{ flexShrink: 0 }}>
        <SparkChart data={spark} width={120} height={40} showArea={false} />
      </div>
      <Icon name="chevron-right" size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
    </Link>
  )
}

function Summary({ items, title }: { items: ApiMover[]; title: string }) {
  const { t } = useTranslation()
  const rise = items.filter(i => i.change > 0).sort((a, b) => b.change - a.change)[0]
  const fall = items.filter(i => i.change < 0).sort((a, b) => a.change - b.change)[0]
  const volume = items.reduce((s, i) => s + i.volume_delta, 0)
  const row = (label: string, value: React.ReactNode) => (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
      <div className="meta-label">{label}</div>
      <div style={{ marginTop: 4 }}>{value}</div>
    </div>
  )
  const mini = (m: ApiMover | undefined) => m ? (
    <Link to={`/mercado/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{cleanLabel(m.question)}</span>
      <Change value={m.change} size="sm" />
    </Link>
  ) : <span className="meta-label">—</span>
  return (
    <div className="card" style={{ padding: '16px 16px 4px' }}>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: 6 }}>{title}</h3>
      {row(t('news.moved'), <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{items.length}</span>)}
      {row(t('news.topRise'), mini(rise))}
      {row(t('news.topFall'), mini(fall))}
      {row(t('news.volume'), <span className="num" style={{ fontSize: 20, fontWeight: 600 }}>{formatVolume(volume)} PT</span>)}
    </div>
  )
}

// Página Noticias (estilo Polymarket "Noticias de última hora"): banner, píldoras
// de categoría, lista numerada de los mercados que más se movieron en 24 h y
// resumen a la derecha. Sin movimientos en 24 h → misma lista a 7 días con aviso.
export function News() {
  const { t } = useTranslation()
  const [items, setItems] = useState<ApiMover[]>([])
  const [hours, setHours] = useState(HOURS)
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState<Category | 'Todos'>('Todos')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    let active = true
    marketsApi.movers(HOURS)
      .then(async data => {
        if (data.length > 0) return { data, hours: HOURS }
        return { data: await marketsApi.movers(HOURS_FALLBACK), hours: HOURS_FALLBACK }
      })
      .then(({ data, hours }) => { if (active) { setItems(data); setHours(hours) } })
      .catch(() => { if (active) setItems([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { setVisible(PAGE_SIZE) }, [cat])

  const filtered = cat === 'Todos' ? items : items.filter(i => i.category === cat)
  const fallback = hours !== HOURS
  const pills: (Category | 'Todos')[] = ['Todos', ...CATEGORIES]

  return (
    <>
      <CategoryBar />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="news-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>

            {/* Banner */}
            <div className="card anim-1" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 200 }}>
              <div style={{ padding: '28px 28px', minWidth: 0 }}>
                <p className="meta-label" style={{ margin: '0 0 10px' }}>{formatDate(new Date(), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 8px' }}>{t('news.title')}</h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{t('news.subtitle')}</p>
              </div>
              <HeroArt />
            </div>

            {fallback && !loading && (
              <p className="meta-label" style={{ margin: '14px 0 0' }}>{t('news.fallback')}</p>
            )}

            {/* Píldoras de categoría */}
            <div className="pills anim-2" role="tablist" style={{ margin: '20px 0 8px' }}>
              {pills.map(p => (
                <button key={p} type="button" role="tab" aria-selected={cat === p} className={`pill${cat === p ? ' active' : ''}`} onClick={() => setCat(p)}>
                  {p === 'Todos' ? t('news.all') : p}
                </button>
              ))}
            </div>

            {/* Lista */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 84 }} />)}
              </div>
            ) : filtered.length > 0 ? (
              <>
                <div className="anim-3">
                  {filtered.slice(0, visible).map((item, i) => (
                    <MoverRow key={item.id} item={item} rank={i + 1} />
                  ))}
                </div>
                {filtered.length > visible && (
                  <SeeMoreButton remaining={filtered.length - visible} onClick={() => setVisible(v => v + PAGE_SIZE)} />
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', color: 'var(--text-tertiary)',
                }}>
                  <Icon name="news" size={22} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {items.length === 0 ? t('news.empty') : t('news.emptyCategory')}
                </p>
                {items.length === 0 && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{t('news.emptyHint')}</p>
                )}
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="anim-2">
            {loading ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : (
              <Summary items={items} title={fallback ? t('news.summaryTitle7') : t('news.summaryTitle')} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
