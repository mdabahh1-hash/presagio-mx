import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, Outcome } from '../types'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { Badge } from './Badge'

interface MarketCardProps {
  market: Market
  animClass?: string
}

function MultiOutcomeList({ outcomes, sub, marketId }: { outcomes: Outcome[]; sub?: string | null; marketId: string }) {
  const { t } = useTranslation()
  const sorted = [...outcomes].sort((a, b) => b.price - a.price)
  const top = sorted.slice(0, 3)
  const rest = sorted.length - 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top.map(o => (
        <div key={o.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={sub} marketId={marketId} size={18} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {o.label}
          </span>
          <div style={{ width: 56, background: 'var(--border-subtle)', borderRadius: 2, height: 4, flexShrink: 0 }}>
            <div style={{ width: `${Math.min(o.price, 100)}%`, height: '100%', background: 'var(--text-secondary)', borderRadius: 2 }} />
          </div>
          <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', width: 40, textAlign: 'right', flexShrink: 0 }}>
            {Math.round(o.price)}%
          </span>
        </div>
      ))}
      {rest > 0 && (
        <span className="meta-label">{t('card.more', { count: rest })}</span>
      )}
    </div>
  )
}

// Tarjeta de mercado (grid de Home / Mercados): thumbnail + pregunta arriba,
// probabilidad al centro, meta + Sí/No abajo. Sin sparkline, sin badges extra.
export function MarketCard({ market, animClass = '' }: MarketCardProps) {
  const { t } = useTranslation()
  const isMulti = market.marketType === 'multi'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'

  const yesColor = market.yesPrice >= 65 ? 'var(--green)' : market.yesPrice <= 35 ? 'var(--red)' : 'var(--text-primary)'

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card"
        style={{
          padding: 16, cursor: 'pointer', height: '100%',
          display: 'flex', flexDirection: 'column', gap: 14,
          opacity: isPending ? 0.85 : 1,
        }}
      >
        {/* Cabecera: thumbnail + pregunta */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <MarketThumb market={market} size={40} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1, minWidth: 0 }}>
            {market.question}
          </p>
        </div>

        {/* Probabilidad */}
        {isMulti ? (
          <MultiOutcomeList outcomes={market.outcomes ?? []} sub={market.subcategory} marketId={market.id} />
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: 24, fontWeight: 600, color: yesColor, lineHeight: 1, letterSpacing: '-0.01em' }}>
                {market.yesPrice}%
              </span>
              <span className="meta-label">{t('card.chance', { defaultValue: 'Sí' })}</span>
            </div>
            <div className="prob-bar-track">
              <div className="prob-bar-fill" style={{ width: `${market.yesPrice}%`, background: yesColor === 'var(--text-primary)' ? 'var(--text-secondary)' : yesColor }} />
            </div>
          </div>
        )}

        {/* Pie: meta + Sí/No */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 10 }}>
          <div className="meta-label num" style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span>{t('card.vol')} {formatVolume(market.volume)} PT</span>
            <span aria-hidden>·</span>
            {isPending ? (
              <Badge tone="accent">{t('card.waitingResolution')}</Badge>
            ) : (
              <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
            )}
          </div>
          {!isMulti && !isPending && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <span className="price-yes num" style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 6 }}>{t('common.yes')}</span>
              <span className="price-no num" style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 6 }}>{t('common.no')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
