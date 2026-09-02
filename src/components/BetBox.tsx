import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tradesApi, marketsApi, authApi, type ApiOutcome, type ApiQuote } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { displayPair } from '../lib/prices'
import { useDebouncedValue, useThrottledValue } from '../lib/useDebouncedValue'
import { formatNum } from '../lib/format'
import { translateApiError } from '../lib/errors'

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
      <div className="exchange-header" style={{ marginBottom: compact ? 16 : 20 }}>{t('bet.title')}</div>

      {isMulti ? (
        /* ── Multi-outcome: outcome selector ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: compact ? 16 : 22 }}>
          {outcomes.map(o => {
            const isSelected = selectedOutcomeKey === o.outcome_key
              || (!selectedOutcomeKey && outcomes[0]?.outcome_key === o.outcome_key)
            return (
              <button
                key={o.outcome_key}
                onClick={() => onOutcomeSelect?.(o.outcome_key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border-subtle)'}`,
                  background: isSelected ? 'var(--oro-dim)' : 'transparent',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {o.label}
                </span>
                <span style={{ fontSize: '0.78rem', fontFamily: 'DM Mono', fontWeight: 700, color: isSelected ? 'var(--gold)' : 'var(--text-tertiary)' }}>
                  {o.price.toFixed(1)}%
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Binary: YES / NO selector ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: compact ? 16 : 22 }}>
          {(['YES', 'NO'] as const).map(s => {
            const isSelected = side === s
            const color = s === 'YES' ? 'var(--green)' : 'var(--red)'
            const price = s === 'YES' ? pair.yes : pair.no
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  padding: compact ? '13px 10px' : '16px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                  background: isSelected
                    ? s === 'YES' ? 'var(--green-soft)' : 'var(--red-soft)'
                    : 'transparent',
                  transition: 'all 0.15s', textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '0.7rem', fontWeight: 600,
                  color: isSelected ? color : 'var(--text-tertiary)',
                  letterSpacing: '0.04em', marginBottom: 6,
                }}>
                  {s === 'YES' ? t('common.yes') : t('common.no')}
                </div>
                <div className="font-mono" style={{
                  fontSize: compact ? '1.25rem' : '1.4rem', fontWeight: 700,
                  color: isSelected ? color : 'var(--text-secondary)',
                  lineHeight: 1, letterSpacing: '-0.02em',
                }}>
                  {price}%
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Amount input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{t('bet.amount')}</span>
          {user && (
            <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.75rem' }}>
              {formatNum(Math.floor(user.points))} PT
            </span>
          )}
        </label>
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <button
            className="amount-adjust-btn"
            onClick={() => setAmount(a => Math.max(100, a - 500))}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 16px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
            }}
          >−</button>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(100, parseInt(e.target.value) || 100))}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', textAlign: 'center',
              fontSize: '1.05rem', fontWeight: 700,
              fontFamily: 'DM Mono', color: 'var(--text-primary)',
              minWidth: 0,
            }}
          />
          <span style={{
            display: 'flex', alignItems: 'center',
            paddingRight: 12, fontSize: '0.72rem',
            fontWeight: 600, color: 'var(--gold)',
          }}>PT</span>
          <button
            className="amount-adjust-btn"
            onClick={() => setAmount(a => a + 500)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 16px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
            }}
          >+</button>
        </div>
        <input
          type="range" min={100} max={10000} step={100}
          value={amount}
          onChange={e => setAmount(parseInt(e.target.value))}
          style={{ width: '100%', marginTop: 10 }}
        />
      </div>

      {/* Preset amounts */}
      <div className="amount-presets" style={{ display: 'flex', gap: 6, marginBottom: compact ? 16 : 20 }}>
        {[500, 1000, 2500, 5000].map(v => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            style={{
              flex: 1,
              background: amount === v ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${amount === v ? 'var(--border-default)' : 'var(--border-subtle)'}`,
              borderRadius: 8, padding: '7px 4px',
              fontSize: '0.72rem',
              color: amount === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer', fontFamily: 'DM Mono', fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Trade summary — every number comes from the SAME quote (single source of truth) */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 10, padding: '14px 16px',
        marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.avgPrice')}</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {quote ? `${quote.avg_fill_price.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.receive')}</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {quote ? t('bet.sharesValue', { value: quote.shares.toFixed(1) }) : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.potentialGain')}</span>
          <span className="font-mono" style={{ color: 'var(--green)', fontWeight: 700 }}>
            {quote ? `+${Math.round(quote.potential_gain)} PT` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.maxLoss')}</span>
          <span className="font-mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
            {quote ? `-${Math.round(quote.max_loss)} PT` : `-${amount} PT`}
          </span>
        </div>

        {/* Collapsible price details */}
        {quote && (
          <div>
            <button
              onClick={() => setDetailsOpen(o => !o)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 700,
                fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {t('bet.priceDetails')} {detailsOpen ? '▴' : '▾'}
            </button>
            {detailsOpen && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.bestPrice')}</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{quote.mid_price.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.orderAvgPrice')}</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{quote.avg_fill_price.toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('bet.slippageCost')}</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{quote.slippage_cost.toFixed(1)} PT</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {t('bet.priceImpact', { from: quote.mid_price.toFixed(1), to: quote.price_after.toFixed(1) })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Low-liquidity warning (amber) — informs, never blocks */}
      {quote?.liquidity_warning && (
        <div style={{
          margin: '0 0 14px', fontSize: '0.78rem', color: 'var(--warning)',
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: 8, padding: '10px 14px', lineHeight: 1.5,
        }}>
          {t('bet.lowLiquidity', { price: quote.avg_fill_price.toFixed(1) })}
        </div>
      )}

      {tradeError && (
        <div style={{
          margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--red)',
          background: 'var(--red-soft)',
          border: '1px solid var(--red-border)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          {tradeError}
        </div>
      )}
      {tradeSuccess && (
        <div style={{
          margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--green)',
          background: 'var(--green-soft)',
          border: '1px solid var(--green-border)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          ✓ {tradeSuccess}
        </div>
      )}

      <button
        onClick={handleTrade}
        disabled={trading || (isMulti && !selectedOutcome)}
        style={{
          width: '100%', padding: '16px',
          background: isMulti
            ? 'linear-gradient(135deg, #c8a000, #a07800)'
            : side === 'YES'
            ? 'linear-gradient(135deg, #00e87d, #00ba64)'
            : 'linear-gradient(135deg, #ff2d55, #cc1a40)',
          border: 'none', borderRadius: 12,
          color: isMulti ? '#07071A' : side === 'YES' ? '#001a0d' : '#fff',
          fontFamily: 'DM Sans', fontWeight: 700,
          fontSize: '0.92rem', letterSpacing: '0.02em',
          cursor: (trading || (isMulti && !selectedOutcome)) ? 'not-allowed' : 'pointer',
          opacity: (trading || (isMulti && !selectedOutcome)) ? 0.6 : 1,
          boxShadow: isMulti
            ? '0 6px 28px rgba(200, 160, 0, 0.3)'
            : side === 'YES'
            ? '0 6px 28px rgba(0, 232, 125, 0.3)'
            : '0 6px 28px rgba(255, 45, 85, 0.3)',
          transition: 'opacity 0.15s, box-shadow 0.2s',
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
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <a href={authApi.googleUrl()} style={{ fontSize: '0.82rem', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
            {t('bet.loginToTradeLink')}
          </a>
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
        {t('bet.disclaimer')}
      </p>
    </div>
  )
}
