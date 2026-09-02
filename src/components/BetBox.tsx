import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tradesApi, marketsApi, authApi, type ApiOutcome, type ApiQuote } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { displayPair } from '../lib/prices'
import { useDebouncedValue, useThrottledValue } from '../lib/useDebouncedValue'
import { formatNum } from '../lib/format'
import { translateApiError } from '../lib/errors'
import { Icon } from './Icon'

interface BetBoxProps {
  marketId: string
  yesPrice: number
  marketType?: 'binary' | 'multi'
  outcomes?: ApiOutcome[]
  selectedOutcomeKey?: string | null
  onOutcomeSelect?: (key: string) => void
  onTraded?: (newYesPrice: number) => void
  onRequireAuth?: () => void
  compact?: boolean
  initialSide?: 'YES' | 'NO'
  initialAmount?: number
}

export function BetBox({
  marketId,
  yesPrice,
  marketType = 'binary',
  outcomes = [],
  selectedOutcomeKey,
  onOutcomeSelect,
  onTraded,
  onRequireAuth,
  compact = false,
  initialSide,
  initialAmount,
}: BetBoxProps) {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [side, setSide] = useState<'YES' | 'NO'>(initialSide ?? 'YES')
  const [amount, setAmount] = useState(initialAmount && initialAmount > 0 ? Math.round(initialAmount) : 1000)
  const [trading, setTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)
  const [quote, setQuote] = useState<ApiQuote | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const isMulti = marketType === 'multi'
  // NO label derived from rounded YES so the pair always sums to 100.
  const pair = displayPair(yesPrice)

  const selectedOutcome = isMulti
    ? outcomes.find(o => o.outcome_key === selectedOutcomeKey) ?? outcomes[0] ?? null
    : null

  // Re-quote triggers: amount is debounced (300ms — user input), while
  // WS-driven price ticks are throttled to at most one re-quote per 2s
  // (latest value wins; intermediate ticks are not queued).
  const debouncedAmount = useDebouncedValue(amount, 300)
  const wsPrice = isMulti ? (selectedOutcome?.price ?? 0) : yesPrice
  const throttledWsPrice = useThrottledValue(wsPrice, 2000)

  useEffect(() => {
    let cancelled = false
    const opts = isMulti
      ? selectedOutcome ? { outcome_key: selectedOutcome.outcome_key, amount: debouncedAmount } : null
      : { side, amount: debouncedAmount }
    if (!opts) { setQuote(null); return }
    marketsApi.quote(marketId, opts)
      .then(q => { if (!cancelled) setQuote(q) })
      .catch(() => { if (!cancelled) setQuote(null) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, debouncedAmount, side, selectedOutcome?.outcome_key, isMulti, throttledWsPrice])

  const handleTrade = async () => {
    if (!user) {
      if (onRequireAuth) { onRequireAuth(); return }
      setTradeError(t('bet.loginToTrade'))
      return
    }
    setTrading(true)
    setTradeError(null)
    setTradeSuccess(null)
    try {
      // Use the current quote's price as protection; if it expired, refresh it first.
      let quotedPrice = quote?.avg_fill_price
      if (quote && Date.now() > new Date(quote.quote_expires_at).getTime()) {
        try {
          const fresh = await marketsApi.quote(marketId, isMulti
            ? { outcome_key: selectedOutcome!.outcome_key, amount }
            : { side, amount })
          setQuote(fresh)
          quotedPrice = fresh.avg_fill_price
        } catch { quotedPrice = undefined }
      }

      let result
      if (isMulti) {
        if (!selectedOutcome) { setTradeError(t('bet.selectOutcome')); setTrading(false); return }
        result = await tradesApi.execute(marketId, { outcome_key: selectedOutcome.outcome_key, points: amount, quoted_avg_price: quotedPrice })
        setTradeSuccess(t('bet.successMulti', { shares: result.shares.toFixed(1), label: selectedOutcome.label, cost: Math.round(result.cost) }))
      } else {
        result = await tradesApi.execute(marketId, { side, points: amount, quoted_avg_price: quotedPrice })
        setTradeSuccess(t('bet.successBinary', { shares: result.shares.toFixed(1), side: side === 'YES' ? t('common.yes') : t('common.no'), cost: Math.round(result.cost) }))
      }
      track('Trade', { market: marketId, type: marketType, cost: Math.round(result.cost) })
      onTraded?.(result.new_yes_price)
      await refreshUser()
      setTimeout(() => setTradeSuccess(null), 4000)
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'PRICE_MOVED') {
        setTradeError(t('errors.PRICE_MOVED'))
        // Auto re-quote so the panel shows the fresh execution price.
        marketsApi.quote(marketId, isMulti
          ? { outcome_key: selectedOutcome!.outcome_key, amount }
          : { side, amount })
          .then(setQuote)
          .catch(() => {})
      } else {
        setTradeError(translateApiError(err))
      }
    } finally {
      setTrading(false)
    }
  }

  return (
    <div>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: compact ? 12 : 16 }}>{t('bet.title')}</h3>

      {isMulti ? (
        /* ── Multi-outcome: outcome selector ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: compact ? 14 : 18 }}>
          {outcomes.map(o => {
            const isSelected = selectedOutcomeKey === o.outcome_key
              || (!selectedOutcomeKey && outcomes[0]?.outcome_key === o.outcome_key)
            return (
              <button
                key={o.outcome_key}
                onClick={() => onOutcomeSelect?.(o.outcome_key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--border-hover)' : 'transparent'}`,
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isSelected ? 'var(--text-primary)' : 'var(--border-default)'}`, background: isSelected ? 'var(--text-primary)' : 'transparent', color: 'var(--bg-base)' }}>
                  {isSelected && <Icon name="check" size={11} strokeWidth={3} />}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {o.label}
                </span>
                <span className="num" style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {o.price.toFixed(1)}%
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Binary: YES / NO selector ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: compact ? 14 : 18 }}>
          {(['YES', 'NO'] as const).map(s => {
            const isSelected = side === s
            const color = s === 'YES' ? 'var(--green)' : 'var(--red)'
            const soft = s === 'YES' ? 'var(--green-soft)' : 'var(--red-soft)'
            const border = s === 'YES' ? 'var(--green-border)' : 'var(--red-border)'
            const price = s === 'YES' ? pair.yes : pair.no
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  height: 48, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${isSelected ? border : 'transparent'}`,
                  background: isSelected ? soft : 'var(--bg-elevated)',
                  color: isSelected ? color : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {s === 'YES' ? t('common.yes') : t('common.no')}
                <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>{price}%</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Amount input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t('bet.amount')}</span>
          {user && (
            <span className="num" style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {formatNum(Math.floor(user.points))} PT
            </span>
          )}
        </label>
        <div className="input" style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 4px' }}>
          <button className="icon-btn amount-adjust-btn" onClick={() => setAmount(a => Math.max(100, a - 500))} aria-label="−" style={{ width: 40, height: 40 }}>
            <Icon name="minus" size={16} />
          </button>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(100, parseInt(e.target.value) || 100))}
            className="num"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', textAlign: 'center', fontFamily: 'inherit',
              fontSize: 20, fontWeight: 600, color: 'var(--text-primary)',
              minWidth: 0,
            }}
          />
          <span className="meta-label" style={{ paddingRight: 6 }}>PT</span>
          <button className="icon-btn amount-adjust-btn" onClick={() => setAmount(a => a + 500)} aria-label="+" style={{ width: 40, height: 40 }}>
            <Icon name="plus" size={16} />
          </button>
        </div>
        <input
          type="range" min={100} max={10000} step={100}
          value={amount}
          onChange={e => setAmount(parseInt(e.target.value))}
          style={{ width: '100%', marginTop: 12 }}
        />
      </div>

      {/* Preset amounts */}
      <div className="amount-presets" style={{ display: 'flex', gap: 6, marginBottom: compact ? 14 : 18 }}>
        {[500, 1000, 2500, 5000].map(v => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className="btn btn-secondary btn-sm num"
            style={{
              flex: 1, padding: 0,
              borderColor: amount === v ? 'var(--border-hover)' : undefined,
              color: amount === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {v.toLocaleString('en-US')}
          </button>
        ))}
      </div>

      {/* Trade summary — every number comes from the SAME quote (single source of truth) */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '10px 0', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.avgPrice')}</span>
          <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {quote ? `${quote.avg_fill_price.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.receive')}</span>
          <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {quote ? t('bet.sharesValue', { value: quote.shares.toFixed(1) }) : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.potentialGain')}</span>
          <span className="num" style={{ color: 'var(--green)', fontWeight: 600 }}>
            {quote ? `+${Math.round(quote.potential_gain)} PT` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.maxLoss')}</span>
          <span className="num" style={{ color: 'var(--red)', fontWeight: 600 }}>
            {quote ? `-${Math.round(quote.max_loss)} PT` : `-${amount} PT`}
          </span>
        </div>

        {/* Collapsible price details */}
        {quote && (
          <div>
            <button
              onClick={() => setDetailsOpen(o => !o)}
              className="btn btn-ghost btn-sm"
              style={{ padding: 0, height: 22, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}
            >
              {t('bet.priceDetails')}
              <Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={13} />
            </button>
            {detailsOpen && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.bestPrice')}</span>
                  <span className="num" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{quote.mid_price.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.orderAvgPrice')}</span>
                  <span className="num" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{quote.avg_fill_price.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.slippageCost')}</span>
                  <span className="num" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{quote.slippage_cost.toFixed(1)} PT</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {t('bet.priceImpact', { from: quote.mid_price.toFixed(1), to: quote.price_after.toFixed(1) })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Low-liquidity warning (amber) — informs, never blocks */}
      {quote?.liquidity_warning && (
        <div style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--warning)', background: 'var(--warning-bg)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
          {t('bet.lowLiquidity', { price: quote.avg_fill_price.toFixed(1) })}
        </div>
      )}

      {tradeError && (
        <div style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--red)', background: 'var(--red-soft)', borderRadius: 8, padding: '10px 12px' }}>
          {tradeError}
        </div>
      )}
      {tradeSuccess && (
        <div style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--green)', background: 'var(--green-soft)', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="check" size={16} strokeWidth={2.2} style={{ marginTop: 1 }} />
          <span>{tradeSuccess}</span>
        </div>
      )}

      <button
        onClick={handleTrade}
        disabled={trading || (isMulti && !selectedOutcome)}
        className="btn btn-lg"
        style={{
          width: '100%',
          background: isMulti ? 'var(--accent-fill)' : side === 'YES' ? 'var(--green-fill)' : 'var(--red-fill)',
          color: isMulti ? 'var(--text-on-accent)' : side === 'YES' ? 'var(--text-on-green)' : 'var(--text-on-red)',
          fontWeight: 600,
        }}
      >
        {trading
          ? t('bet.processing')
          : isMulti
          ? selectedOutcome
            ? t('bet.betBtn', { label: selectedOutcome.label, amount })
            : t('bet.selectOutcomeBtn')
          : t('bet.buyBtn', { side: side === 'YES' ? t('common.yes') : t('common.no'), amount })
        }
      </button>

      {!user && !onRequireAuth && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <a href={authApi.googleUrl()} style={{ fontSize: 13, color: 'var(--text-primary)', textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 500 }}>
            {t('bet.loginToTradeLink')}
          </a>
        </div>
      )}

      <p className="meta-label" style={{ margin: '12px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
        {t('bet.disclaimer')}
      </p>
    </div>
  )
}
