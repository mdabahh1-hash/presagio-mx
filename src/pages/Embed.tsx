import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMarket, type ApiOutcome, type ApiPricePoint } from '../lib/api'
import { marketSocket } from '../lib/websocket'
import { FullChart, MultiLineChart, outcomeColor, type MultiSeries } from '../components/SparkChart'
import { Logo } from '../components/Logo'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { displayPair } from '../lib/prices'
import { SITE } from '../lib/embed'
import { cleanLabel } from '../lib/mapMarket'
import { TeamMark } from '../components/TeamMark'
import type { PricePoint } from '../types'

/** Widget incrustable: /embed/:id?ref=CODE — sin navbar/footer, solo el mercado. */
export function Embed() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const ref = params.get('ref')

  const [market, setMarket] = useState<ApiMarket | null>(null)
  const [yesPrice, setYesPrice] = useState(50)
  const [outcomes, setOutcomes] = useState<ApiOutcome[]>([])
  const [history, setHistory] = useState<PricePoint[]>([])
  const [outcomeSeries, setOutcomeSeries] = useState<Record<string, PricePoint[]>>({})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    marketsApi.get(id).then(m => {
      setMarket(m)
      setYesPrice(m.yes_price)
      setOutcomes([...(m.outcomes ?? [])].map(o => ({ ...o, label: cleanLabel(o.label) })).sort((a, b) => b.price - a.price))
      marketsApi.history(id, 365).then(hist => {
        setHistory(hist.filter((p: ApiPricePoint) => !p.outcome_key).map(p => ({ date: p.recorded_at, price: p.yes_price })))
        const series: Record<string, PricePoint[]> = {}
        for (const pt of hist) {
          if (!pt.outcome_key) continue
          ;(series[pt.outcome_key] ??= []).push({ date: pt.recorded_at, price: pt.yes_price })
        }
        setOutcomeSeries(series)
      }).catch(() => {})
    }).catch(() => setFailed(true))
  }, [id])

  useEffect(() => {
    if (!id) return
    marketSocket.connect(id)
    const unsub = marketSocket.subscribe(data => {
      if (data.type !== 'price_update' || data.market_id !== id) return
      const now = new Date().toISOString()
      if (typeof data.yes_price === 'number') {
        setYesPrice(data.yes_price as number)
        setHistory(prev => [...prev, { date: now, price: data.yes_price as number }])
      }
      if (Array.isArray(data.outcomes)) {
        const incoming = data.outcomes as { outcome_key: string; price: number }[]
        setOutcomeSeries(prev => {
          const next = { ...prev }
          for (const o of incoming) next[o.outcome_key] = [...(next[o.outcome_key] ?? []), { date: now, price: o.price }]
          return next
        })
        setOutcomes(prev => [...prev.map(o => {
          const u = incoming.find(x => x.outcome_key === o.outcome_key)
          return u ? { ...o, price: u.price } : o
        })].sort((a, b) => b.price - a.price))
      }
    })
    return () => { unsub(); marketSocket.disconnect() }
  }, [id])

  const multiSeries = useMemo<MultiSeries[]>(() => outcomes.slice(0, 4).map((o, i) => ({
    outcome_key: o.outcome_key,
    label: o.label,
    color: outcomeColor(i),
    data: outcomeSeries[o.outcome_key] ?? [{ date: new Date().toISOString(), price: o.price }],
  })), [outcomes, outcomeSeries])

  // El CTA lleva el código de referido del autor del embed (la home lo captura).
  const marketUrl = id
    ? ref ? `${SITE}/?ref=${encodeURIComponent(ref)}#/mercado/${encodeURIComponent(id)}` : `${SITE}/m/${encodeURIComponent(id)}`
    : SITE

  const wrap: React.CSSProperties = {
    minHeight: '100vh', boxSizing: 'border-box', padding: 14,
    background: 'var(--bg-base)', color: 'var(--text-primary)',
    display: 'flex', flexDirection: 'column', gap: 10,
  }

  if (failed) {
    return (
      <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Logo size={22} />
        <span style={{ fontSize: '0.85rem' }}>{t('market.notFound')}</span>
      </div>
    )
  }
  if (!market) return <div style={wrap} />

  const pair = displayPair(yesPrice)
  const isMulti = market.market_type === 'multi'
  const catColor = getCategoryColor(market.category)

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <a href={marketUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo size={22} />
          <span style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: '0.8rem', color: 'var(--text-primary)' }}>VEREDIKT</span>
        </a>
        <span style={{ fontSize: 11, fontWeight: 600, color: catColor, background: getCategoryBg(market.category), padding: '3px 7px', borderRadius: 6 }}>
          {market.category}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {market.question}
      </div>

      {isMulti ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3, columnGap: 10, fontSize: '0.78rem' }}>
            {outcomes.slice(0, 3).map((o, i) => (
              <div key={o.outcome_key} style={{ display: 'contents' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: outcomeColor(i), flexShrink: 0 }} />
                  <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                </span>
                <span style={{ fontWeight: 700 }}>{Math.round(o.price)}%</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MultiLineChart series={multiSeries} height={120} showLegend={false} />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: '1.7rem', color: 'var(--green)' }}>{pair.yes}%</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)' }}>{t('common.yes')}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{t('common.no')} · {pair.no}%</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <FullChart data={history} height={130} label={t('common.yes')} />
          </div>
        </>
      )}

      <a
        href={marketUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          height: 34, borderRadius: 8, textDecoration: 'none',
          background: 'var(--accent-fill)', color: 'var(--text-on-accent)', fontWeight: 600, fontSize: 13,
        }}
      >
        {t('embed.cta')}
      </a>
    </div>
  )
}
