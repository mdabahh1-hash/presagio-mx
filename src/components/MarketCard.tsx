import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, Outcome } from '../types'
import { SparkChart } from './SparkChart'
import { getCategoryColor, getCategoryBg, getCategoryBorder } from '../lib/categoryColors'
import { formatVolume, formatCountdown } from '../lib/format'

function useCountdown(endsAt: string) {
  const [diff, setDiff] = useState(() => new Date(endsAt).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(endsAt).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return diff
}

interface MarketCardProps {
  market: Market & { status?: string }
  animClass?: string
}

function MultiOutcomeList({ outcomes }: { outcomes: Outcome[] }) {
  const { t } = useTranslation()
  const sorted = [...outcomes].sort((a, b) => b.price - a.price)
  const top = sorted.slice(0, 3)
  const rest = sorted.length - 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '4px 0' }}>
      {top.map((o) => (
        <div key={o.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '0.75rem', color: 'var(--text-secondary)', flex: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {o.label}
          </span>
          <div style={{ width: 60, background: 'var(--border-subtle)', borderRadius: 3, height: 4, flexShrink: 0 }}>
            <div style={{
              width: `${Math.min(o.price, 100)}%`, height: '100%',
              background: 'var(--gold)', borderRadius: 3,
            }} />
          </div>
          <span style={{
            fontSize: '0.72rem', fontFamily: 'DM Mono', fontWeight: 700,
            color: 'var(--gold)', width: 36, textAlign: 'right', flexShrink: 0,
          }}>
            {o.price.toFixed(1)}%
          </span>
        </div>
      ))}
      {rest > 0 && (
        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
          {t('card.more', { count: rest })}
        </span>
      )}
    </div>
  )
}

export function MarketCard({ market, animClass = '' }: MarketCardProps) {
  const { t } = useTranslation()
  const isMulti = market.marketType === 'multi'
  const isUp = market.history.length > 1
    ? market.history[market.history.length - 1].price >= market.history[0].price
    : true
  const catColor = getCategoryColor(market.category)
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'

  const yesColor = market.yesPrice >= 70
    ? 'var(--green)'
    : market.yesPrice <= 30
    ? 'var(--red)'
    : 'var(--gold)'

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card"
        style={{
          padding: '20px 22px',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          ...(isPending ? { borderColor: 'var(--oro-glow)' } : {}),
        }}
      >
        {/* Header row: badges + sparkline */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: catColor,
                background: getCategoryBg(market.category), border: `1px solid ${getCategoryBorder(market.category)}`,
                padding: '3px 9px', borderRadius: 99,
              }}>
                {market.category}
              </span>
              {isMulti && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--accent-alt)',
                  background: 'var(--accent-alt-bg)',
                  border: '1px solid var(--accent-alt-border)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  {t('common.multiBadge')}
                </span>
              )}
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
              {isPending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'var(--oro-dim)',
                  border: '1px solid var(--gold)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  {t('common.pendingBadge')}
                </span>
              )}
            </div>

            {/* Question */}
            <p className="font-display" style={{
              margin: 0, fontSize: '0.9rem', fontWeight: 600,
              color: 'var(--text-primary)', lineHeight: 1.4,
              letterSpacing: '-0.01em',
            }}>
              {market.question}
            </p>
          </div>

          {/* Sparkline — only for binary */}
          {!isMulti && (
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <SparkChart data={market.history.slice(-24)} width={80} height={38} />
            </div>
          )}
        </div>

        {/* Probability display */}
        {isMulti ? (
          <MultiOutcomeList outcomes={market.outcomes ?? []} />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{
                  fontSize: '1.6rem', fontWeight: 800,
                  fontFamily: 'DM Mono', color: yesColor,
                  lineHeight: 1, letterSpacing: '-0.02em',
                }}>
                  {market.yesPrice}%
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {t('common.yes')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {t('common.no')}
                </span>
                <span style={{
                  fontSize: '0.95rem', fontWeight: 700,
                  fontFamily: 'DM Mono', color: 'var(--text-secondary)',
                }}>
                  {100 - market.yesPrice}%
                </span>
              </div>
            </div>
            <div className="prob-bar-track">
              <div className="prob-bar-fill" style={{ width: `${market.yesPrice}%` }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              {t('card.vol')}{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                {formatVolume(market.volume)}
              </span>
            </span>
            {!isMulti && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                {t('card.liq')}{' '}
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono', fontWeight: 600 }}>
                  {formatVolume(market.liquidity)}
                </span>
              </span>
            )}
          </div>
          {isPending ? (
            <span style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 700 }}>
              {t('card.waitingResolution')}
            </span>
          ) : (
            <span style={{
              fontSize: '0.68rem',
              color: urgent ? 'var(--red)' : 'var(--text-tertiary)',
              fontWeight: urgent ? 700 : 400,
              fontFamily: urgent ? 'DM Mono' : undefined,
            }}>
              {diff > 0 ? '⏱ ' : ''}{countdownText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
