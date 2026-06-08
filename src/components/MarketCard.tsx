import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Market } from '../types'
import { SparkChart } from './SparkChart'

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toFixed(0)
}

function useCountdown(endsAt: string) {
  const [diff, setDiff] = useState(() => new Date(endsAt).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(endsAt).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return diff
}

function formatCountdown(diff: number): { text: string; urgent: boolean } {
  if (diff <= 0) return { text: 'Cerrado', urgent: false }
  const totalSecs = Math.floor(diff / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  if (days >= 30) {
    const months = Math.floor(days / 30)
    return { text: `${months} ${months === 1 ? 'mes' : 'meses'}`, urgent: false }
  }
  if (days >= 1) return { text: `${days}d ${hours}h`, urgent: days <= 1 }
  if (hours >= 1) return { text: `${hours}h ${mins}m`, urgent: true }
  return { text: `${mins}m ${secs}s`, urgent: true }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#e0522e',
  'Economía': '#ffd060',
  'Deportes': '#00e87d',
  'Global': '#4f8eff',
  'Tech': '#a060ff',
  'Entretenimiento': '#ff7eb6',
  'Mundial 2026': '#00e87d',
  'Crypto': '#f7931a',
  'Mercados Globales': '#4f8eff',
  'México': '#e0522e',
}

interface MarketCardProps {
  market: Market & { status?: string }
  animClass?: string
}

export function MarketCard({ market, animClass = '' }: MarketCardProps) {
  const isUp = market.history.length > 1
    ? market.history[market.history.length - 1].price >= market.history[0].price
    : true
  const catColor = CATEGORY_COLORS[market.category] || '#8888cc'
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
          ...(isPending ? { borderColor: 'rgba(255, 208, 96, 0.4)' } : {}),
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
                background: `${catColor}16`, border: `1px solid ${catColor}35`,
                padding: '3px 9px', borderRadius: 99,
              }}>
                {market.category}
              </span>
              {market.trending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'rgba(255, 208, 96, 0.1)',
                  border: '1px solid rgba(255, 208, 96, 0.25)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  ▲ TENDENCIA
                </span>
              )}
              {isPending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'rgba(255, 208, 96, 0.1)',
                  border: '1px solid var(--gold)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  PENDIENTE
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

          {/* Sparkline */}
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <SparkChart data={market.history.slice(-24)} width={80} height={38} />
          </div>
        </div>

        {/* Probability display */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{
                fontSize: '1.6rem', fontWeight: 800,
                fontFamily: 'JetBrains Mono', color: yesColor,
                lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {market.yesPrice}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                SÍ
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                NO
              </span>
              <span style={{
                fontSize: '0.95rem', fontWeight: 700,
                fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)',
              }}>
                {100 - market.yesPrice}%
              </span>
            </div>
          </div>
          <div className="prob-bar-track">
            <div className="prob-bar-fill" style={{ width: `${market.yesPrice}%` }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              Vol{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                {formatVolume(market.volume)}
              </span>
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              Liq{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                {formatVolume(market.liquidity)}
              </span>
            </span>
          </div>
          {isPending ? (
            <span style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 700 }}>
              Esperando resolución
            </span>
          ) : (
            <span style={{
              fontSize: '0.68rem',
              color: urgent ? 'var(--red)' : 'var(--text-tertiary)',
              fontWeight: urgent ? 700 : 400,
              fontFamily: urgent ? 'JetBrains Mono' : undefined,
            }}>
              {diff > 0 ? '⏱ ' : ''}{countdownText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
