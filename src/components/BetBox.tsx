import React, { useState } from 'react'
import { tradesApi, type ApiOutcome } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'

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
}: BetBoxProps) {
  const { user, refreshUser } = useAuth()
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState(100)
  const [trading, setTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)

  const isMulti = marketType === 'multi'
  const noPrice = Math.round(100 - yesPrice)

  const selectedOutcome = isMulti
    ? outcomes.find(o => o.outcome_key === selectedOutcomeKey) ?? outcomes[0] ?? null
    : null

  const currentPrice = isMulti
    ? (selectedOutcome?.price ?? 0)
    : side === 'YES' ? yesPrice : noPrice

  const potential = currentPrice > 0
    ? ((amount / (currentPrice / 100)) - amount).toFixed(0)
    : '0'

  const handleTrade = async () => {
    if (!user) {
      if (onRequireAuth) { onRequireAuth(); return }
      setTradeError('Inicia sesión para operar')
      return
    }
    setTrading(true)
    setTradeError(null)
    setTradeSuccess(null)
    try {
      let result
      if (isMulti) {
        if (!selectedOutcome) { setTradeError('Selecciona un resultado'); setTrading(false); return }
        result = await tradesApi.execute(marketId, { outcome_key: selectedOutcome.outcome_key, points: amount })
        setTradeSuccess(`Compraste ${result.shares.toFixed(2)} acciones de "${selectedOutcome.label}" por ${result.cost.toFixed(0)} PT`)
      } else {
        result = await tradesApi.execute(marketId, { side, points: amount })
        setTradeSuccess(`Compraste ${result.shares.toFixed(2)} acciones ${side} por ${result.cost.toFixed(0)} PT`)
      }
      track('Trade', { market: marketId, type: marketType, cost: Math.round(result.cost) })
      onTraded?.(result.new_yes_price)
      await refreshUser()
      setTimeout(() => setTradeSuccess(null), 4000)
    } catch (e: any) {
      setTradeError(e.message)
    } finally {
      setTrading(false)
    }
  }

  return (
    <div>
      <div className="exchange-header" style={{ marginBottom: compact ? 16 : 20 }}>Operar</div>

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
                  background: isSelected ? 'rgba(255,208,96,0.08)' : 'transparent',
                  transition: 'all 0.15s', textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {o.label}
                </span>
                <span style={{ fontSize: '0.78rem', fontFamily: 'DM Mono', fontWeight: 800, color: isSelected ? 'var(--gold)' : 'var(--text-tertiary)' }}>
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
            const price = s === 'YES' ? Math.round(yesPrice) : noPrice
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  padding: compact ? '13px 10px' : '16px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                  background: isSelected
                    ? s === 'YES' ? 'rgba(0, 232, 125, 0.1)' : 'rgba(255, 45, 85, 0.1)'
                    : 'transparent',
                  transition: 'all 0.15s', textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '0.65rem', fontWeight: 800,
                  color: isSelected ? color : 'var(--text-tertiary)',
                  letterSpacing: '0.12em', marginBottom: 6,
                }}>
                  {s === 'YES' ? 'SÍ' : 'NO'}
                </div>
                <div className="font-mono" style={{
                  fontSize: compact ? '1.25rem' : '1.4rem', fontWeight: 800,
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
          <span style={{ color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.03em' }}>CANTIDAD</span>
          {user && (
            <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono', fontWeight: 700, fontSize: '0.75rem' }}>
              {Math.floor(user.points).toLocaleString('es-MX')} PT
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
            onClick={() => setAmount(a => Math.max(10, a - 50))}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 16px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
            }}
          >−</button>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(10, parseInt(e.target.value) || 10))}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', textAlign: 'center',
              fontSize: '1.05rem', fontWeight: 800,
              fontFamily: 'DM Mono', color: 'var(--text-primary)',
              minWidth: 0,
            }}
          />
          <span style={{
            display: 'flex', alignItems: 'center',
            paddingRight: 12, fontSize: '0.72rem',
            fontWeight: 800, color: 'var(--gold)',
          }}>PT</span>
          <button
            className="amount-adjust-btn"
            onClick={() => setAmount(a => a + 50)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 16px', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
            }}
          >+</button>
        </div>
        <input
          type="range" min={10} max={1000} step={10}
          value={amount}
          onChange={e => setAmount(parseInt(e.target.value))}
          style={{ width: '100%', marginTop: 10 }}
        />
      </div>

      {/* Preset amounts */}
      <div className="amount-presets" style={{ display: 'flex', gap: 6, marginBottom: compact ? 16 : 20 }}>
        {[50, 100, 250, 500].map(v => (
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
              cursor: 'pointer', fontFamily: 'DM Mono', fontWeight: 700,
              transition: 'all 0.15s',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Trade summary */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 10, padding: '14px 16px',
        marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Precio actual</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {currentPrice.toFixed(1)}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Ganancia potencial</span>
          <span className="font-mono" style={{ color: 'var(--green)', fontWeight: 800 }}>
            +{potential} PT
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Máx. pérdida</span>
          <span className="font-mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
            -{amount} PT
          </span>
        </div>
      </div>

      {tradeError && (
        <div style={{
          margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--red)',
          background: 'rgba(255, 45, 85, 0.08)',
          border: '1px solid rgba(255, 45, 85, 0.2)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          {tradeError}
        </div>
      )}
      {tradeSuccess && (
        <div style={{
          margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--green)',
          background: 'rgba(0, 232, 125, 0.08)',
          border: '1px solid rgba(0, 232, 125, 0.2)',
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
          fontFamily: 'DM Sans', fontWeight: 800,
          fontSize: '0.92rem', letterSpacing: '0.06em',
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
          ? 'PROCESANDO...'
          : isMulti
          ? selectedOutcome
            ? `APOSTAR "${selectedOutcome.label}" · ${amount} PT`
            : 'SELECCIONA UN RESULTADO'
          : `COMPRAR ${side === 'YES' ? 'SÍ' : 'NO'} · ${amount} PT`
        }
      </button>

      {!user && !onRequireAuth && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <a href="/api/auth/google" style={{ fontSize: '0.82rem', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
            Inicia sesión para operar →
          </a>
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
        VEREDIKT opera con puntos virtuales. No se involucra dinero real.
      </p>
    </div>
  )
}
