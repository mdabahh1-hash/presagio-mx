import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { displayPair } from '../lib/prices'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { marketsApi, authApi, type ApiMarket, type ApiComment, type ApiPricePoint, type ApiOutcome } from '../lib/api'
import { marketSocket } from '../lib/websocket'
import { useAuth } from '../lib/AuthContext'
import { FullChart, MultiLineChart, outcomeColor } from '../components/SparkChart'
import { BetBox } from '../components/BetBox'
import { track } from '../lib/analytics'
import type { PricePoint } from '../types'
import { formatVolume, formatDate, daysLeft } from '../lib/format'
import { buildEmbedSnippet } from '../lib/embed'
import { useMobile } from '../lib/useMobile'
import { useElementWidth } from '../lib/useElementWidth'
import { Badge } from '../components/Badge'
import { Icon, type IconName } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { MarketThumb } from '../components/MarketThumb'
import { Tabs } from '../components/Tabs'
import { TeamMark } from '../components/TeamMark'
import { outcomeLogo } from '../lib/teamLogos'
import { cleanLabel } from '../lib/mapMarket'
import { kindLabelKey } from '../lib/categories'
import type { Category } from '../types'

type InfoTab = 'criteria' | 'rules' | 'context'
const INFO_CLAMP_LINES = 6

type ChartRange = '1h' | '6h' | '1d' | '1w' | '1m' | 'all'
const CHART_RANGES: ChartRange[] = ['1h', '6h', '1d', '1w', '1m', 'all']
const RANGE_LABELS: Record<ChartRange, string> = { '1h': '1H', '6h': '6H', '1d': '1D', '1w': '1S', '1m': '1M', all: '' }
const RANGE_MS: Record<ChartRange, number> = {
  '1h': 3_600_000, '6h': 6 * 3_600_000, '1d': 86_400_000, '1w': 7 * 86_400_000, '1m': 30 * 86_400_000, all: Infinity,
}

/** Recorta la serie al rango; antepone el último punto previo al corte
 *  (carry-forward) para que la línea no arranque "en el aire". */
function filterRange(data: PricePoint[], range: ChartRange): PricePoint[] {
  if (range === 'all' || data.length === 0) return data
  const now = Date.now()
  const cutoff = now - RANGE_MS[range]
  const last = data[data.length - 1]
  const firstIdx = data.findIndex(p => Date.parse(p.date) >= cutoff)
  const out = firstIdx === -1 ? [] : data.slice(firstIdx)
  const prev = firstIdx === -1 ? last : firstIdx > 0 ? data[firstIdx - 1] : null
  if (prev) out.unshift({ date: new Date(cutoff).toISOString(), price: prev.price })
  // El precio vigente se extiende hasta ahora para que la gráfica cubra todo el rango.
  out.push({ date: new Date(now).toISOString(), price: last.price })
  return out
}

export function MarketDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  // "Copiar jugada" prefill: /mercado/:id?side=YES&monto=120&outcome=key
  const [searchParams] = useSearchParams()
  const copySide = searchParams.get('side') === 'NO' ? 'NO' : searchParams.get('side') === 'YES' ? 'YES' : undefined
  const copyAmount = Number(searchParams.get('monto')) || undefined
  const copyOutcome = searchParams.get('outcome')

  const [market, setMarket] = useState<ApiMarket | null>(null)
  const [yesPrice, setYesPrice] = useState(50)
  const [volume, setVolume] = useState(0)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [comments, setComments] = useState<ApiComment[]>([])
  const [outcomes, setOutcomes] = useState<ApiOutcome[]>([])
  const [selectedOutcomeKey, setSelectedOutcomeKey] = useState<string | null>(null)
  const [outcomeSeries, setOutcomeSeries] = useState<Record<string, PricePoint[]>>({})
  const [loading, setLoading] = useState(true)

  const [comment, setComment] = useState('')
  const [chartRange, setChartRange] = useState<ChartRange>('all')
  // Sección "Criterios | Normas | Contexto" (estilo Polymarket): pestaña activa,
  // texto colapsado a 6 líneas con "Mostrar más" cuando desborda.
  const [infoTab, setInfoTab] = useState<InfoTab>('criteria')
  const [infoExpanded, setInfoExpanded] = useState(false)
  const [infoOverflows, setInfoOverflows] = useState(false)
  const infoRef = useRef<HTMLParagraphElement>(null)
  // Normas/Contexto solo aparecen cuando el mercado trae texto (los resueltos viejos no lo tienen).
  const infoTabs = useMemo(() => {
    const items: { key: InfoTab; label: string }[] = [{ key: 'criteria', label: t('market.resolutionTitle') }]
    if (market?.rules) items.push({ key: 'rules', label: t('market.rulesTab') })
    if (market?.context) items.push({ key: 'context', label: t('market.contextTab') })
    return items
  }, [market, t])
  const infoText = infoTab === 'rules' ? market?.rules : infoTab === 'context' ? market?.context : market?.resolution_criteria
  useLayoutEffect(() => {
    if (infoExpanded) return
    const el = infoRef.current
    setInfoOverflows(!!el && el.scrollHeight > el.clientHeight + 1)
  }, [infoTab, infoText, infoExpanded])
  // Multi: outcomes dibujados en la gráfica (default top 4 por precio).
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [showChartMenu, setShowChartMenu] = useState(false)
  const chartMenuRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)

  // Móvil: el panel de operar en flujo quedaba al final de la página; se
  // sustituye por una barra fija abajo que abre un bottom sheet con el BetBox.
  const isMobile = useMobile()
  const [sheetSide, setSheetSide] = useState<'YES' | 'NO' | null>(null)
  const sheetOpen = sheetSide !== null
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetSide(null) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [sheetOpen])
  useEffect(() => { setSheetSide(null) }, [id])

  // Ancho real de la columna del chart: el SVG usa viewBox fijo, y sin
  // medirlo en móvil las etiquetas de los ejes se escalaban a ~5px.
  const [chartRef, chartW] = useElementWidth()

  useEffect(() => {
    if (!id) return
    // Market fetch is the only critical call; a transient history/comments failure
    // must not make an existing market read as "no encontrado".
    marketsApi.get(id).then((m) => {
      setMarket(m)
      setYesPrice(m.yes_price)
      setVolume(m.volume)
      if (m.market_type === 'multi') {
        const sorted = [...(m.outcomes ?? [])].map(o => ({ ...o, label: cleanLabel(o.label) })).sort((a, b) => b.price - a.price)
        setOutcomes(sorted)
        const preselected = copyOutcome && sorted.some(o => o.outcome_key === copyOutcome) ? copyOutcome : null
        setSelectedOutcomeKey(preselected ?? sorted[0]?.outcome_key ?? null)
        setVisibleKeys(new Set(sorted.slice(0, 4).map(o => o.outcome_key)))
      }

      // Timestamp completo (no truncado a día) para que los rangos 1H/6H/1D
      // y el tooltip con hora funcionen; los rangos se filtran en cliente.
      marketsApi.history(id, 365).then((hist) => {
        setHistory(hist.filter((p: ApiPricePoint) => !p.outcome_key).map((p: ApiPricePoint) => ({ date: p.recorded_at, price: p.yes_price })))
        if (m.market_type === 'multi') {
          const series: Record<string, PricePoint[]> = {}
          for (const pt of hist) {
            if (!pt.outcome_key) continue
            if (!series[pt.outcome_key]) series[pt.outcome_key] = []
            series[pt.outcome_key].push({ date: pt.recorded_at, price: pt.yes_price })
          }
          if (Object.keys(series).length === 0) {
            const today = new Date().toISOString()
            for (const o of m.outcomes ?? []) series[o.outcome_key] = [{ date: today, price: o.price }]
          }
          setOutcomeSeries(series)
        }
      }).catch(() => {})

      marketsApi.comments(id).then(setComments).catch(() => {})
    }).catch(() => setMarket(null)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    marketSocket.connect(id)
    const unsub = marketSocket.subscribe((data) => {
      if (data.type === 'price_update' && data.market_id === id) {
        if (typeof data.yes_price === 'number') setYesPrice(data.yes_price as number)
        if (typeof data.volume === 'number') setVolume(data.volume as number)
        if (Array.isArray(data.outcomes)) {
          const incoming = data.outcomes as { outcome_key: string; price: number }[]
          const now = new Date().toISOString()
          setOutcomeSeries(prev => {
            const next = { ...prev }
            for (const o of incoming) {
              next[o.outcome_key] = [...(next[o.outcome_key] ?? []), { date: now, price: o.price }]
            }
            return next
          })
          // Also update the visible outcome prices (ranked list + BetBox) on others' trades.
          setOutcomes(prev => {
            const updated = prev.map(o => {
              const u = incoming.find(x => x.outcome_key === o.outcome_key)
              return u ? { ...o, price: u.price } : o
            })
            return [...updated].sort((a, b) => b.price - a.price)
          })
        } else if (typeof data.yes_price === 'number') {
          // Guard: comment broadcasts also carry type 'price_update' but no yes_price.
          setHistory(prev => [...prev, { date: new Date().toISOString(), price: data.yes_price as number }])
        }
      }
      if (data.event === 'new_comment' && data.market_id === id) {
        marketsApi.comments(id).then(setComments).catch(() => {})
      }
    })
    return () => {
      unsub()
      marketSocket.disconnect()
    }
  }, [id])

  const chartData = useMemo(() => filterRange(history, chartRange), [history, chartRange])

  // Series multi visibles, con color estable por posición en la lista completa.
  const multiSeries = useMemo(() => outcomes
    .map((o, i) => ({
      outcome_key: o.outcome_key,
      label: o.label,
      color: outcomeColor(i),
      data: filterRange(outcomeSeries[o.outcome_key] ?? [], chartRange),
    }))
    .filter(s => visibleKeys.has(s.outcome_key)), [outcomes, outcomeSeries, chartRange, visibleKeys])

  const toggleOutcome = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev // mínimo una línea
        next.delete(key)
      } else next.add(key)
      return next
    })
  }

  // Cerrar el menú "Mostrar en el gráfico" con click fuera / Escape
  useEffect(() => {
    if (!showChartMenu) return
    const onDown = (e: MouseEvent) => {
      if (chartMenuRef.current && !chartMenuRef.current.contains(e.target as Node)) setShowChartMenu(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowChartMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [showChartMenu])

  const handlePostComment = async () => {
    if (!user || !comment.trim() || !id) return
    try {
      const newComment = await marketsApi.postComment(id, comment.trim())
      setComments(prev => [newComment, ...prev])
      setComment('')
    } catch {}
  }

  if (loading) {
    // Skeleton con la misma forma que la página final (breadcrumb, header,
    // gráfica, stats + panel): sin "Cargando…" centrado y sin salto al llegar.
    return (
      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 24 }} aria-busy="true" aria-label={t('market.loading')}>
        <div className="skeleton" style={{ height: 14, width: 320, maxWidth: '70%', borderRadius: 6, marginBottom: 28 }} />
        <div className="market-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="skeleton" style={{ height: 300 }} />
            <div className="skeleton" style={{ height: 290 }} />
            <div className="market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 78, borderRadius: 12 }} />)}
            </div>
          </div>
          <div className="market-trading-panel skeleton" style={{ height: 520 }} />
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="page-container" style={{ paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('market.notFound')}</p>
        <Link to="/mercados" className="btn btn-secondary">
          <Icon name="arrow-left" size={14} />
          {t('market.backToMarkets')}
        </Link>
      </div>
    )
  }

  const catColor = getCategoryColor(market.category)
  const pair = displayPair(yesPrice)  // NO derived from rounded YES: always sums to 100
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--text-primary)'
  const hasMobileBar = isMobile && market.status === 'open'
  const leader = outcomes[0]
  const thumbMarket = { id: market.id, question: market.question, outcomes, imageUrl: market.image_url, subcategory: market.subcategory, category: market.category as Category }
  const statusPanel: Record<string, { icon: IconName; color: string; title: string; body: string }> = {
    resolved: { icon: 'trophy', color: 'var(--green)', title: t('market.winnerTitle', { label: outcomes.find(o => o.outcome_key === market.resolved_outcome_key)?.label ?? market.resolved_outcome_key ?? '' }), body: t('market.pointsDistributed') },
    pending_resolution: { icon: 'hourglass', color: 'var(--accent)', title: t('market.pendingTitle'), body: t('market.pendingBody') },
    resolved_yes: { icon: 'check', color: 'var(--green)', title: t('market.resolvedYesWon'), body: t('market.pointsDistributed') },
    resolved_no: { icon: 'x', color: 'var(--red)', title: t('market.resolvedNoWon'), body: t('market.pointsDistributed') },
    closed: { icon: 'lock', color: 'var(--text-secondary)', title: t('market.closedTitle'), body: t('market.closedBody') },
    cancelled: { icon: 'ban', color: 'var(--text-tertiary)', title: t('market.cancelledTitle'), body: t('market.cancelledBody') },
  }

  const betBox = (
    <BetBox
      marketId={market.id}
      yesPrice={yesPrice}
      marketType={market.market_type as 'binary' | 'multi'}
      outcomes={outcomes}
      selectedOutcomeKey={selectedOutcomeKey}
      onOutcomeSelect={setSelectedOutcomeKey}
      subcategory={market.subcategory}
      initialSide={sheetSide ?? copySide}
      initialAmount={copyAmount}
      compact={hasMobileBar}
      onTraded={(p) => {
        setYesPrice(p)
        if (market.market_type === 'multi') {
          marketsApi.outcomes(market.id).then(updated => {
            setOutcomes([...updated].map(o => ({ ...o, label: cleanLabel(o.label) })).sort((a, b) => b.price - a.price))
          }).catch(() => {})
        }
      }}
    />
  )

  return (
    <div className={`page-container market-detail-page${hasMobileBar ? ' has-mobile-bar' : ''}`} style={{ paddingTop: 32, paddingBottom: 24 }}>
      {/* Breadcrumb */}
      <div className="anim-1 meta-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', fontSize: 13 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0 8px 0 4px', height: 28, marginLeft: -4 }}
        >
          <Icon name="arrow-left" size={14} />
          {t('common.back')}
        </button>
        <Link to="/mercados" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
          {t('market.breadcrumbMarkets')}
        </Link>
        <Icon name="chevron-right" size={12} style={{ color: 'var(--text-tertiary)' }} />
        <Link to={`/mercados?cat=${encodeURIComponent(market.category)}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          {market.category}
        </Link>
        {market.subcategory && (
          <>
            <Icon name="chevron-right" size={12} style={{ color: 'var(--text-tertiary)' }} />
            <Link
              to={`/mercados?cat=${encodeURIComponent(market.category)}&sub=${encodeURIComponent(market.subcategory)}`}
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              {market.subcategory}
            </Link>
            {market.kind && (
              <>
                <Icon name="chevron-right" size={12} style={{ color: 'var(--text-tertiary)' }} />
                <Link
                  to={`/mercados?cat=${encodeURIComponent(market.category)}&sub=${encodeURIComponent(market.subcategory)}&kind=${market.kind}`}
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                >
                  {t(kindLabelKey(market.kind))}
                </Link>
              </>
            )}
          </>
        )}
      </div>

      <div className="market-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Market header */}
          <div className="anim-1">
            {/* Cabecera: thumbnail + badges + pregunta */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <MarketThumb market={thumbMarket} size={64} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge tone="category" color={catColor} bg={getCategoryBg(market.category)}>{market.subcategory ?? market.category}</Badge>
                  {market.trending && <Badge icon="trending">{t('common.trendingBadge')}</Badge>}
                  {market.status === 'pending_resolution' && <Badge tone="accent">{t('common.pendingBadge')}</Badge>}
                </div>
                <h1 style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.015em', margin: 0, lineHeight: 1.25 }}>
                  {market.question}
                </h1>
              </div>
            </div>

            {/* Resolved banner */}
            {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: market.status === 'resolved_yes' ? 'var(--green-soft)' : 'var(--red-soft)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 14, fontWeight: 600,
                color: market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)',
              }}>
                <Icon name={market.status === 'resolved_yes' ? 'check' : 'x'} size={16} strokeWidth={2.2} />
                {market.status === 'resolved_yes' ? t('market.resolvedYes') : t('market.resolvedNo')}
              </div>
            )}
            {market.status === 'resolved' && market.resolved_outcome_key && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--green-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 14, fontWeight: 600, color: 'var(--green)',
              }}>
                <Icon name="trophy" size={16} />
                {t('market.winner', { label: outcomes.find(o => o.outcome_key === market.resolved_outcome_key)?.label ?? market.resolved_outcome_key })}
              </div>
            )}

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.65 }}>
              {market.description}
            </p>

            {/* Probability display — binary or multi */}
            {market.market_type === 'multi' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                {outcomes.map((o, i) => {
                  const isSelected = selectedOutcomeKey === o.outcome_key
                  const isWinner = market.status === 'resolved' && market.resolved_outcome_key === o.outcome_key
                  return (
                    <div
                      key={o.outcome_key}
                      onClick={() => setSelectedOutcomeKey(o.outcome_key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${isWinner ? 'var(--green-border)' : isSelected ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
                        background: isWinner ? 'var(--green-soft)' : isSelected ? 'var(--bg-elevated)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span className="num" style={{ fontSize: 12, fontWeight: 500, width: 22, height: 22, flexShrink: 0, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {outcomeLogo(o, market.subcategory, market.id)
                          ? <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={22} />
                          : i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {o.label}
                        {isWinner && <Icon name="check" size={14} strokeWidth={2.2} style={{ color: 'var(--green)' }} />}
                      </span>
                      <div style={{ width: 80, background: 'var(--border-subtle)', borderRadius: 2, height: 4, flexShrink: 0 }}>
                        <div style={{ width: `${Math.min(o.price, 100)}%`, height: '100%', background: isWinner ? 'var(--green)' : 'var(--text-secondary)', borderRadius: 2 }} />
                      </div>
                      <span className="num" style={{ width: 52, textAlign: 'right', flexShrink: 0, fontSize: 14, fontWeight: 600, color: isWinner ? 'var(--green)' : 'var(--text-primary)' }}>
                        {o.price.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                  <span className="num" style={{ fontSize: 'clamp(2.2rem, 4vw, 2.8rem)', fontWeight: 700, color: yesColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {pair.yes}%
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{t('carousel.chance')}</span>
                </div>
                <div className="prob-bar-track" style={{ height: 6, marginBottom: 6 }}>
                  <div className="prob-bar-fill" style={{ width: `${yesPrice}%`, background: yesColor === 'var(--text-primary)' ? 'var(--text-secondary)' : yesColor }} />
                </div>
                <div className="meta-label num" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--green)' }}>{t('common.yes')} {pair.yes}%</span>
                  <span style={{ color: 'var(--red)' }}>{t('common.no')} {pair.no}%</span>
                </div>
              </>
            )}

            {/* Share */}
            {(() => {
              const url = `${window.location.origin}/m/${id}`
              const text = `${market.question} — Predice en VEREDIKT`
              const iconBtn: React.CSSProperties = { width: 34, height: 34, border: '1px solid var(--border-subtle)' }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  <span className="meta-label" style={{ marginRight: 4 }}>
                    {t('common.share')}
                  </span>
                  <a className="icon-btn" onClick={() => track('Share', { channel: 'whatsapp', market: id ?? '' })} href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareWhatsApp')} style={iconBtn}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.358 11.944-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                  <a className="icon-btn" onClick={() => track('Share', { channel: 'x', market: id ?? '' })} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareX')} style={iconBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); track('Share', { channel: 'copy', market: id ?? '' }); setTimeout(() => setCopied(false), 2000) }}
                    style={{ height: 34, color: copied ? 'var(--green)' : undefined }}
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={14} />
                    {copied ? t('common.copied') : t('common.copyLink')}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setShowEmbed(v => !v); track('Share', { channel: 'embed', market: id ?? '' }) }}
                    aria-expanded={showEmbed}
                    style={{ height: 34, borderColor: showEmbed ? 'var(--border-hover)' : undefined }}
                  >
                    <Icon name="code" size={14} />
                    {t('market.embedBtn')}
                  </button>
                </div>
              )
            })()}

            {showEmbed && (() => {
              const snippet = buildEmbedSnippet(market, yesPrice, { ref: user?.referral_code ?? null })
              return (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t('market.embedTitle')}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { navigator.clipboard?.writeText(snippet); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000) }}
                    >
                      <Icon name={embedCopied ? 'check' : 'copy'} size={14} />
                      {embedCopied ? t('common.copied') : t('market.embedCopy')}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 12px', lineHeight: 1.4 }}>{t('market.embedHint')}</p>
                  {/* Vista previa: el mismo widget que verá quien pegue el código. */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <iframe
                      title={t('market.embedPreview')}
                      src={`${window.location.origin}/#/embed/${encodeURIComponent(market.id)}`}
                      width={400}
                      height={320}
                      style={{ border: '1px solid var(--border-default)', borderRadius: 12, maxWidth: '100%', background: 'var(--bg-base)' }}
                    />
                  </div>
                  <div className="meta-label" style={{ marginBottom: 6 }}>{t('market.embedCode')}</div>
                  <textarea
                    readOnly
                    value={snippet}
                    onFocus={e => e.currentTarget.select()}
                    spellCheck={false}
                    style={{
                      width: '100%', boxSizing: 'border-box', height: 150, resize: 'vertical', fontSize: '0.68rem', lineHeight: 1.4,
                      background: 'var(--bg-base)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 10,
                    }}
                  />
                </div>
              )
            })()}
          </div>

          {/* Chart */}
          <div className="anim-2" style={{ paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <div className="chart-head" style={{ marginBottom: 8 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>{t('market.historyTitle')}</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tabs<ChartRange>
                  size="sm"
                  items={CHART_RANGES.map(p => ({ key: p, label: p === 'all' ? t('market.periodAll') : RANGE_LABELS[p] }))}
                  active={chartRange}
                  onChange={setChartRange}
                />
                {market.market_type === 'multi' && (
                  <div ref={chartMenuRef} style={{ position: 'relative', marginLeft: 4 }}>
                    <button
                      onClick={() => setShowChartMenu(v => !v)}
                      aria-label={t('market.showOnChart')}
                      aria-expanded={showChartMenu}
                      title={t('market.showOnChart')}
                      className="icon-btn"
                      style={{ width: 30, height: 30, background: showChartMenu ? 'var(--bg-hover)' : undefined }}
                    >
                      <Icon name="sliders" size={15} />
                    </button>
                    {showChartMenu && (
                      <div className="dropdown-panel" style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, minWidth: 260,
                        background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                        borderRadius: 12, boxShadow: 'var(--shadow-pop)', padding: '12px 14px',
                      }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                          {t('market.showOnChart')}
                        </div>
                        {outcomes.map((o, i) => {
                          const on = visibleKeys.has(o.outcome_key)
                          const lastOn = on && visibleKeys.size === 1
                          return (
                            <label key={o.outcome_key} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                              cursor: lastOn ? 'default' : 'pointer', opacity: lastOn ? 0.7 : 1,
                            }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: on ? outcomeColor(i) : 'var(--border-default)', flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {o.label}
                              </span>
                              <button
                                role="switch"
                                aria-checked={on}
                                aria-label={o.label}
                                disabled={lastOn}
                                onClick={() => toggleOutcome(o.outcome_key)}
                                style={{
                                  width: 36, height: 20, borderRadius: 10, border: 'none', padding: 2, flexShrink: 0,
                                  background: on ? 'var(--text-primary)' : 'var(--border-default)',
                                  cursor: lastOn ? 'default' : 'pointer', transition: 'background 0.15s',
                                  display: 'flex', alignItems: 'center',
                                }}
                              >
                                <span style={{
                                  width: 16, height: 16, borderRadius: '50%', background: on ? 'var(--bg-base)' : 'var(--text-tertiary)',
                                  transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.15s',
                                }} />
                              </button>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div ref={chartRef}>
              {market.market_type === 'multi' ? (
                <MultiLineChart series={multiSeries} height={220} viewW={chartW || 700} />
              ) : chartData.length > 1 ? (
                <FullChart data={chartData} height={200} viewW={chartW || 700} label={t('common.yes')} />
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  {t('common.noHistory')}
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="anim-3 stat-row">
            {[
              { label: t('market.statsVolume'), value: formatVolume(volume), unit: 'PT' },
              { label: t('market.statsTrades'), value: market.num_trades.toString(), unit: '' },
              { label: t('market.statsClose'), value: daysLeft(market.ends_at, market.status), unit: '' },
              { label: t('market.statsComments'), value: comments.length.toString(), unit: '' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">
                  {stat.value}
                  {stat.unit && <span className="meta-label" style={{ marginLeft: 4 }}>{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Criterios de resolución | Normas | Contexto del mercado (estilo Polymarket) */}
          <div className="anim-4" style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <Tabs<InfoTab>
              size="sm"
              className="tabs-line"
              ariaLabel={t('market.resolutionTitle')}
              items={infoTabs}
              active={infoTab}
              onChange={key => { setInfoTab(key); setInfoExpanded(false) }}
            />
            <p
              ref={infoRef}
              className={infoExpanded ? undefined : 'info-clamp'}
              style={{ margin: '14px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}
            >
              {infoText}
            </p>
            {(infoOverflows || infoExpanded) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 6, marginLeft: -8 }}
                aria-expanded={infoExpanded}
                onClick={() => setInfoExpanded(v => !v)}
              >
                {infoExpanded ? t('common.showLess') : t('common.showMore')}
                <Icon name={infoExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
              </button>
            )}
            <div className="meta-label" style={{ marginTop: 14, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {market.resolution_source_url && (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {t('market.resolutionSource')}
                  <a
                    href={market.resolution_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {(() => { try { return new URL(market.resolution_source_url).hostname.replace(/^www\./, '') } catch { return market.resolution_source_url } })()}
                    <Icon name="external" size={12} />
                  </a>
                </span>
              )}
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {t('market.openedDate')}
                <span className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(market.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {t('market.closeDate')}
                <span className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(market.ends_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="anim-5" style={{ paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="section-title" style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {t('market.discussion')}
              <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>{comments.length}</span>
            </h3>
            {user ? (
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <Avatar name={user.display_name} size={32} style={{ marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <textarea
                    className="input"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder={t('market.commentPlaceholder')}
                    rows={3}
                    style={{ width: '100%', display: 'block' }}
                  />
                  <button className="btn btn-secondary btn-sm btn-comment-submit" onClick={handlePostComment} style={{ marginTop: 8 }}>
                    {t('market.publish')}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                <a href={authApi.googleUrl()} style={{ color: 'var(--text-primary)', textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 500 }}>
                  {t('market.loginLink')}
                </a>{' '}{t('market.toComment')}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {comments.map(c => (
                <div key={c.id} className="list-row" style={{ alignItems: 'flex-start', padding: '14px 0' }}>
                  <Avatar name={c.user.display_name} size={28} style={{ marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.user.display_name}</span>
                      <span className="meta-label">{formatDate(c.created_at)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {c.text}
                    </p>
                    <button
                      onClick={() =>
                        marketsApi.likeComment(market.id, c.id)
                          .then(updated => setComments(prev => prev.map(x => x.id === updated.id ? updated : x)))
                          .catch(() => {})
                      }
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 6, marginLeft: -8, height: 26, padding: '0 8px', fontSize: 12, color: 'var(--text-tertiary)' }}
                    >
                      <Icon name="heart" size={13} />
                      <span className="num">{c.likes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Trading panel ── */}
        <div className={`market-trading-panel${hasMobileBar ? ' has-mobile-bar' : ''}`} style={{ position: 'sticky', top: 'calc(var(--nav-h) + 16px)' }}>
          {market.status !== 'open' ? (() => {
            const s = statusPanel[market.status] ?? statusPanel.closed
            return (
              <div className="anim-2 card" style={{ padding: '28px 24px', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', color: s.color,
                }}>
                  <Icon name={s.icon} size={20} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            )
          })() : (
            <div className="anim-2 card" style={{ padding: '20px' }}>
              {!hasMobileBar && betBox}
            </div>
          )}
        </div>
      </div>

      {/* ── Móvil: barra fija de operar + bottom sheet ── */}
      {hasMobileBar && (
        <>
          <div className="mobile-trade-bar">
            {market.market_type === 'multi' ? (
              <button className="mtb-multi" onClick={() => setSheetSide('YES')}>
                {t('bet.title')}
                {leader && (
                  <span style={{ fontWeight: 600, opacity: 0.8, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%' }}>
                    · {leader.label} {Math.round(leader.price)}%
                  </span>
                )}
              </button>
            ) : (
              <>
                <button className="mtb-yes" onClick={() => setSheetSide('YES')}>
                  {t('common.yes')} <span className="font-mono">{pair.yes}%</span>
                </button>
                <button className="mtb-no" onClick={() => setSheetSide('NO')}>
                  {t('common.no')} <span className="font-mono">{pair.no}%</span>
                </button>
              </>
            )}
          </div>
          {sheetOpen && (
            <div className="sheet-overlay" onClick={() => setSheetSide(null)}>
              <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={t('bet.title')} onClick={e => e.stopPropagation()}>
                <div className="sheet-handle" />
                {/* key: el BetBox toma initialSide solo al montar */}
                <div key={sheetSide}>{betBox}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
