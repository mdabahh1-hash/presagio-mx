import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { displayPair } from '../lib/prices'
import { getCategoryColor, getCategoryBg, getCategoryBorder } from '../lib/categoryColors'
import { marketsApi, authApi, type ApiMarket, type ApiComment, type ApiPricePoint, type ApiOutcome } from '../lib/api'
import { marketSocket } from '../lib/websocket'
import { useAuth } from '../lib/AuthContext'
import { FullChart, MultiLineChart } from '../components/SparkChart'
import { BetBox } from '../components/BetBox'
import { track } from '../lib/analytics'
import type { PricePoint } from '../types'
import { formatVolume, formatDate, daysLeft } from '../lib/format'

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
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | 'all'>('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    // Market fetch is the only critical call; a transient history/comments failure
    // must not make an existing market read as "no encontrado".
    marketsApi.get(id).then((m) => {
      setMarket(m)
      setYesPrice(m.yes_price)
      setVolume(m.volume)
      if (m.market_type === 'multi') {
        const sorted = [...(m.outcomes ?? [])].sort((a, b) => b.price - a.price)
        setOutcomes(sorted)
        const preselected = copyOutcome && sorted.some(o => o.outcome_key === copyOutcome) ? copyOutcome : null
        setSelectedOutcomeKey(preselected ?? sorted[0]?.outcome_key ?? null)
      }

      marketsApi.history(id, 90).then((hist) => {
        setHistory(hist.map((p: ApiPricePoint) => ({ date: p.recorded_at.slice(0, 10), price: p.yes_price })))
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
          setHistory(prev => [...prev, { date: new Date().toISOString().slice(0, 10), price: data.yes_price as number }])
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

  const chartData = (() => {
    if (chartPeriod === '7d') return history.slice(-7)
    if (chartPeriod === '30d') return history.slice(-30)
    return history
  })()

  const handlePostComment = async () => {
    if (!user || !comment.trim() || !id) return
    try {
      const newComment = await marketsApi.postComment(id, comment.trim())
      setComments(prev => [newComment, ...prev])
      setComment('')
    } catch {}
  }

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{t('market.loading')}</div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="page-container" style={{ paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('market.notFound')}</p>
        <Link to="/mercados" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          {t('market.backToMarkets')}
        </Link>
      </div>
    )
  }

  const catColor = getCategoryColor(market.category)
  const pair = displayPair(yesPrice)  // NO derived from rounded YES: always sums to 100
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--gold)'

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 24 }}>
      {/* Breadcrumb */}
      <div className="anim-1" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28, fontSize: '0.78rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-tertiary)', fontSize: '0.78rem', fontFamily: 'DM Sans',
            display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s',
          }}
        >
          {t('common.back')}
        </button>
        <span style={{ color: 'var(--border-subtle)' }}>·</span>
        <Link to="/mercados" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.15s' }}>
          {t('market.breadcrumbMarkets')}
        </Link>
        <span style={{ color: 'var(--border-default)' }}>›</span>
        <Link
          to={`/mercados?cat=${encodeURIComponent(market.category)}`}
          style={{ color: catColor, textDecoration: 'none', transition: 'opacity 0.15s' }}
        >
          {market.category}
        </Link>
        <span style={{ color: 'var(--border-default)' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{market.question.slice(0, 42)}…</span>
      </div>

      <div className="market-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Market header */}
          <div className="anim-1 card" style={{ padding: '28px 30px 26px' }}>
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: catColor,
                background: getCategoryBg(market.category), border: `1px solid ${getCategoryBorder(market.category)}`,
                padding: '3px 10px', borderRadius: 99,
              }}>
                {market.category}
              </span>
              {market.trending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'var(--oro-dim)',
                  border: '1px solid var(--oro-glow)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  {t('common.trendingBadge')}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <div className="live-dot" />
                <span style={{ fontSize: '0.62rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em' }}>{t('common.live')}</span>
              </div>
            </div>

            {/* Resolved banner */}
            {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
              <div style={{
                background: market.status === 'resolved_yes' ? 'var(--green-soft)' : 'var(--red-soft)',
                border: `1px solid ${market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: '0.875rem', fontWeight: 700,
                color: market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)',
              }}>
                {market.status === 'resolved_yes' ? t('market.resolvedYes') : t('market.resolvedNo')}
              </div>
            )}
            {market.status === 'resolved' && market.resolved_outcome_key && (
              <div style={{
                background: 'var(--green-soft)',
                border: '1px solid var(--green)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--green)',
              }}>
                {t('market.winner', { label: outcomes.find(o => o.outcome_key === market.resolved_outcome_key)?.label ?? market.resolved_outcome_key })} ✓
              </div>
            )}

            {/* Question */}
            <h1 className="font-display" style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.85rem)',
              fontWeight: 700, letterSpacing: '-0.025em',
              margin: '0 0 18px', lineHeight: 1.25,
            }}>
              {market.question}
            </h1>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.7 }}>
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
                        padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${isWinner ? 'var(--green)' : isSelected ? 'var(--gold)' : 'var(--border-subtle)'}`,
                        background: isWinner ? 'var(--green-soft)' : isSelected ? 'var(--oro-dim)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        fontSize: '0.72rem', fontFamily: 'DM Mono', fontWeight: 800, width: 28, flexShrink: 0,
                        color: i === 0 ? 'var(--gold)' : 'var(--text-tertiary)',
                      }}>
                        #{i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {o.label}
                        {isWinner && <span style={{ marginLeft: 8, color: 'var(--green)' }}>✓</span>}
                      </span>
                      <div style={{ width: 80, background: 'var(--border-subtle)', borderRadius: 3, height: 5, flexShrink: 0 }}>
                        <div style={{ width: `${Math.min(o.price, 100)}%`, height: '100%', background: isWinner ? 'var(--green)' : 'var(--gold)', borderRadius: 3 }} />
                      </div>
                      <span style={{
                        width: 48, textAlign: 'right', flexShrink: 0,
                        fontSize: '0.88rem', fontFamily: 'DM Mono', fontWeight: 800,
                        color: isWinner ? 'var(--green)' : 'var(--gold)',
                      }}>
                        {o.price.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
                  <div>
                    <span style={{
                      fontSize: 'clamp(3rem, 6vw, 4.5rem)',
                      fontWeight: 800, fontFamily: 'DM Mono',
                      color: yesColor, lineHeight: 1,
                      letterSpacing: '-0.04em',
                    }}>
                      {pair.yes}%
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: 10, fontWeight: 600 }}>{t('common.yes')}</span>
                  </div>
                  <div style={{ paddingBottom: 8, opacity: 0.5 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                      {pair.no}%
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 6, fontWeight: 600 }}>{t('common.no')}</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    <span style={{ color: 'var(--green)' }}>{t('common.yes')} · {pair.yes}%</span>
                    <span style={{ color: 'var(--red)' }}>{t('common.no')} · {pair.no}%</span>
                  </div>
                  <div className="prob-bar-dual">
                    <div style={{
                      width: `${yesPrice}%`,
                      background: 'linear-gradient(90deg, var(--green), var(--green-grad-2))',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(90deg, var(--red-grad-2), var(--red))',
                    }} />
                  </div>
                </div>
              </>
            )}

            {/* Share */}
            {(() => {
              const url = `${window.location.origin}/m/${id}`
              const text = `${market.question} — Predice en VEREDIKT`
              const iconBtn: React.CSSProperties = {
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'none',
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {t('common.share')}
                  </span>
                  <a className="share-btn" onClick={() => track('Share', { channel: 'whatsapp', market: id ?? '' })} href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareWhatsApp')} style={iconBtn}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.358 11.944-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                  <a className="share-btn" onClick={() => track('Share', { channel: 'x', market: id ?? '' })} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareX')} style={iconBtn}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <button
                    className="share-btn"
                    onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); track('Share', { channel: 'copy', market: id ?? '' }); setTimeout(() => setCopied(false), 2000) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
                      borderRadius: 99, background: 'var(--bg-elevated)',
                      border: `1px solid ${copied ? 'var(--green)' : 'var(--border-default)'}`,
                      color: copied ? 'var(--green)' : 'var(--text-secondary)', cursor: 'pointer',
                      fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans',
                    }}
                  >
                    {copied ? t('common.copied') : t('common.copyLink')}
                  </button>
                </div>
              )
            })()}
          </div>

          {/* Chart */}
          <div className="anim-2 card" style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="exchange-header">{t('market.historyTitle')}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['7d', '30d', 'all'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    style={{
                      background: chartPeriod === p ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${chartPeriod === p ? 'var(--border-default)' : 'transparent'}`,
                      borderRadius: 6, padding: '4px 12px',
                      fontSize: '0.72rem', fontWeight: 700,
                      color: chartPeriod === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      cursor: 'pointer', fontFamily: 'DM Mono',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p === 'all' ? t('market.periodAll') : p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {market.market_type === 'multi' ? (
              <MultiLineChart
                series={outcomes.map(o => ({
                  outcome_key: o.outcome_key,
                  label: o.label,
                  data: chartPeriod === '7d'
                    ? (outcomeSeries[o.outcome_key] ?? []).slice(-7)
                    : chartPeriod === '30d'
                    ? (outcomeSeries[o.outcome_key] ?? []).slice(-30)
                    : (outcomeSeries[o.outcome_key] ?? []),
                }))}
                height={220}
              />
            ) : chartData.length > 1 ? (
              <FullChart data={chartData} height={200} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                {t('common.noHistory')}
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="anim-3 market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: t('market.statsVolume'), value: formatVolume(volume), unit: 'PT', color: 'var(--text-primary)' },
              { label: t('market.statsTrades'), value: market.num_trades.toString(), unit: '', color: 'var(--text-primary)' },
              { label: t('market.statsClose'), value: daysLeft(market.ends_at, market.status), unit: '', color: 'var(--gold)' },
              { label: t('market.statsComments'), value: comments.length.toString(), unit: '', color: 'var(--text-primary)' },
            ].map(stat => (
              <div key={stat.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                  {stat.unit && <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: 3, fontWeight: 600 }}>{stat.unit}</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Resolution criteria */}
          <div className="anim-4 card" style={{ padding: '22px 26px' }}>
            <div className="exchange-header" style={{ marginBottom: 14 }}>{t('market.resolutionTitle')}</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {market.resolution_criteria}
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{t('market.closeDate')}</span>
              <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatDate(market.ends_at, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="anim-5 card" style={{ padding: '24px 26px' }}>
            <div className="exchange-header" style={{ marginBottom: 20 }}>
              {t('market.discussion')}
              <span style={{
                marginLeft: 8, background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99, padding: '1px 8px',
                fontSize: '0.68rem', color: 'var(--text-tertiary)',
                fontFamily: 'DM Mono', fontWeight: 700,
              }}>
                {comments.length}
              </span>
            </div>
            {user ? (
              <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <div className="avatar" style={{ flexShrink: 0, marginTop: 3 }}>
                  {user.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder={t('market.commentPlaceholder')}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 10, padding: '12px 14px',
                      fontSize: '0.875rem', color: 'var(--text-primary)',
                      fontFamily: 'DM Sans', resize: 'vertical', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                  <button
                    className="btn-comment-submit"
                    onClick={handlePostComment}
                    style={{
                      marginTop: 10,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 8, padding: '9px 18px',
                      fontSize: '0.78rem', color: 'var(--text-primary)',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans',
                      letterSpacing: '0.04em', transition: 'all 0.15s',
                    }}
                  >
                    {t('market.publish')}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 24 }}>
                <a href={authApi.googleUrl()} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                  {t('market.loginLink')}
                </a>{' '}{t('market.toComment')}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <div className="avatar" style={{ flexShrink: 0, marginTop: 2 }}>
                    {c.user.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.user.display_name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {c.text}
                    </p>
                    <button
                      onClick={() =>
                        marketsApi.likeComment(market.id, c.id)
                          .then(updated => setComments(prev => prev.map(x => x.id === updated.id ? updated : x)))
                          .catch(() => {})
                      }
                      style={{
                        marginTop: 8, background: 'none', border: 'none',
                        fontSize: '0.7rem', color: 'var(--text-tertiary)',
                        cursor: 'pointer', padding: 0, transition: 'color 0.15s',
                      }}
                    >
                      ♥ {c.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Trading panel ── */}
        <div className="market-trading-panel" style={{ position: 'sticky', top: 80 }}>
          {market.status !== 'open' ? (
            <div className="anim-2 card" style={{ padding: '32px 26px', textAlign: 'center' }}>
              {market.status === 'resolved' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--green-soft)', border: '1px solid var(--green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>🏆</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)', margin: '0 0 10px' }}>
                    {t('market.winnerTitle', { label: outcomes.find(o => o.outcome_key === market.resolved_outcome_key)?.label ?? market.resolved_outcome_key })}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.65 }}>
                    {t('market.pointsDistributed')}
                  </p>
                </>
              )}
              {market.status === 'pending_resolution' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--oro-dim)',
                    border: '1px solid var(--oro-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>⏳</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', margin: '0 0 10px' }}>
                    {t('market.pendingTitle')}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.65 }}>
                    {t('market.pendingBody')}
                  </p>
                </>
              )}
              {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: market.status === 'resolved_yes' ? 'var(--green-soft)' : 'var(--red-soft)',
                    border: `1px solid ${market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>
                    {market.status === 'resolved_yes' ? '✓' : '✕'}
                  </div>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 700, margin: '0 0 10px',
                    color: market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {market.status === 'resolved_yes' ? t('market.resolvedYesWon') : t('market.resolvedNoWon')}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.65 }}>
                    {t('market.pointsDistributed')}
                  </p>
                </>
              )}
              {market.status === 'closed' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>🔒</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                    {t('market.closedTitle')}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    {t('market.closedBody')}
                  </p>
                </>
              )}
              {market.status === 'cancelled' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>🚫</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
                    {t('market.cancelledTitle')}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    {t('market.cancelledBody')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="anim-2 card" style={{ padding: '24px 22px' }}>
              <BetBox
                marketId={market.id}
                yesPrice={yesPrice}
                marketType={market.market_type as 'binary' | 'multi'}
                outcomes={outcomes}
                selectedOutcomeKey={selectedOutcomeKey}
                onOutcomeSelect={setSelectedOutcomeKey}
                initialSide={copySide}
                initialAmount={copyAmount}
                onTraded={(p) => {
                  setYesPrice(p)
                  if (market.market_type === 'multi') {
                    marketsApi.outcomes(market.id).then(updated => {
                      setOutcomes([...updated].sort((a, b) => b.price - a.price))
                    }).catch(() => {})
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
