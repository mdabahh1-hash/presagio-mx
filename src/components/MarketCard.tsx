import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Market } from '../types'
import { SparkChart } from './SparkChart'

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toFixed(2)
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
  'Política MX': '#c94828',
  'Economía': '#f0c040',
  'Deportes': '#00d084',
  'Global': '#6888ff',
  'Tech': '#a060ff',
  'Entretenimiento': '#ff7eb6',
  'Mundial 2026': '#00d084',
  'Crypto': '#f7931a',
  'Mercados Globales': '#6888ff',
  'México': '#c94828',
}

interface MarketCardProps {
  market: Market & { status?: string }
  animClass?: string
}

export function MarketCard({ market, animClass = '' }: MarketCardProps) {
  const isUp = market.history.length > 1
    ? market.history[market.history.length - 1].price >= market.history[0].price
    : true
  const catColor = CATEGORY_COLORS[market.category] || '#8888b0'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card"
        style={{
          padding: 20, cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
          ...(isPending ? { borderColor: 'var(--gold)', opacity: 0.9 } : {}),
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {/* Category + trending + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`,
                  padding: '2px 8px', borderRadius: 99,
                }}
              >
                {market.category}
              </span>
              {market.trending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--gold)', background: 'rgba(240, 192, 64, 0.1)',
                  border: '1px solid rgba(240, 192, 64, 0.2)', padding: '2px 8px', borderRadius: 99,
                }}>
                  ↑ TENDENCIA
                </span>
              )}
              {isPending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--gold)', background: 'rgba(240, 192, 64, 0.12)',
                  border: '1px solid var(--gold)', padding: '2px 8px', borderRadius: 99,
                }}>
                  ⏳ PENDIENTE
                </span>
              )}
            </div>

            {/* Question */}
            <p
              className="font-display"
              style={{
                margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)',
                lineHeight: 1.4, letterSpacing: '-0.01em',
              }}
            >
              {market.question}
            </p>
          </div>

          {/* Sparkline */}
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <SparkChart data={market.history.slice(-20)} width={80} height={36} />
          </div>
        </div>

        {/* Probability bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono',
                color: market.yesPrice > 50 ? 'var(--green)' : market.yesPrice < 30 ? 'var(--red)' : 'var(--gold)',
              }}>
                {market.yesPrice}%
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>SÍ</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>NO</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
                {100 - market.yesPrice}%
              </span>
            </span>
          </div>
          <div className="prob-bar-track">
            <div className="prob-bar-fill" style={{ width: `${market.yesPrice}%` }} />
          </div>
        </div>

        {/* Footer stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Vol{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>
                {formatVolume(market.volume)} PT
              </span>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Liq{' '}
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>
                {formatVolume(market.liquidity)} PT
              </span>
            </span>
          </div>
          {/* Countdown */}
          {isPending ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>
              Esperando resolución
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: urgent ? 'var(--red)' : 'var(--text-tertiary)', fontWeight: urgent ? 700 : 400, fontFamily: urgent ? 'JetBrains Mono' : undefined }}>
              {diff > 0 ? '⏱ ' : ''}{countdownText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
