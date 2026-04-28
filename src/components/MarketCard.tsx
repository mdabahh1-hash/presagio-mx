import React from 'react'
import { Link } from 'react-router-dom'
import type { Market } from '../types'
import { SparkChart } from './SparkChart'

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toString()
}

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Resuelto'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 día'
  if (days < 30) return `${days} días`
  if (days < 365) return `${Math.floor(days / 30)} meses`
  return `${Math.floor(days / 365)}a ${Math.floor((days % 365) / 30)}m`
}

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#c94828',
  'Economía': '#f0c040',
  'Deportes': '#00d084',
  'Global': '#6888ff',
  'Tech': '#a060ff',
  'Entretenimiento': '#ff7eb6',
}

interface MarketCardProps {
  market: Market
  animClass?: string
}

export function MarketCard({ market, animClass = '' }: MarketCardProps) {
  const isUp = market.history.length > 1
    ? market.history[market.history.length - 1].price >= market.history[0].price
    : true
  const catColor = CATEGORY_COLORS[market.category] || '#8888b0'

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card"
        style={{ padding: 20, cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {/* Category + trending */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: catColor,
                  background: `${catColor}18`,
                  border: `1px solid ${catColor}30`,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                {market.category}
              </span>
              {market.trending && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.2)',
                    padding: '2px 8px',
                    borderRadius: 99,
                  }}
                >
                  ↑ TENDENCIA
                </span>
              )}
            </div>

            {/* Question */}
            <p
              className="font-display"
              style={{
                margin: 0,
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
                letterSpacing: '-0.01em',
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
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'JetBrains Mono',
                  color: market.yesPrice > 50 ? 'var(--green)' : market.yesPrice < 30 ? 'var(--red)' : 'var(--gold)',
                }}
              >
                {market.yesPrice}%
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>SÍ</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>NO</span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  color: 'var(--text-secondary)',
                }}
              >
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
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            Cierra{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{daysLeft(market.endsAt)}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
