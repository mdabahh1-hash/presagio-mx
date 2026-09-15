import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, Outcome } from '../types'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'
import { displayPair } from '../lib/prices'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { Badge } from './Badge'

export type QuickTradeHandler = (side: 'YES' | 'NO', outcomeKey?: string) => void

interface MarketCardProps {
  market: Market
  animClass?: string
  // Inicio móvil (estilo Polymarket): tarjeta compacta con botones que abren
  // la compra sin navegar. Sin la prop la tarjeta queda como siempre.
  onQuickTrade?: QuickTradeHandler
}

// Evita que el botón dispare el Link de la tarjeta
const quick = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn() }

function MultiOutcomeList({ outcomes, sub, marketId, onQuickTrade }: { outcomes: Outcome[]; sub?: string | null; marketId: string; onQuickTrade?: QuickTradeHandler }) {
  const { t } = useTranslation()
  const sorted = [...outcomes].sort((a, b) => b.price - a.price)
  const shown = onQuickTrade ? 2 : 3
  const top = sorted.slice(0, shown)
  const rest = sorted.length - shown

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top.map(o => (
        <div key={o.outcome_key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={sub} marketId={marketId} size={18} />
          <span style={{ fontSize: onQuickTrade ? 14 : 13, color: onQuickTrade ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {o.label}
          </span>
          {onQuickTrade ? (
            <button
              className="btn btn-sm num quick-outcome-btn"
              onClick={quick(() => onQuickTrade('YES', o.outcome_key))}
              style={{ minWidth: 64, fontWeight: 600 }}
            >
              {Math.round(o.price)}%
            </button>
          ) : (
            <>
              <div style={{ width: 56, background: 'var(--border-subtle)', borderRadius: 2, height: 4, flexShrink: 0 }}>
                <div style={{ width: `${Math.min(o.price, 100)}%`, height: '100%', background: 'var(--text-secondary)', borderRadius: 2 }} />
              </div>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', width: 40, textAlign: 'right', flexShrink: 0 }}>
                {Math.round(o.price)}%
              </span>
            </>
          )}
        </div>
      ))}
      {rest > 0 && (
        <span className="meta-label">{t('card.more', { count: rest })}</span>
      )}
    </div>
  )
}

// Sello "Nuevo": 3 días desde la siembra (decisión de Mark, 15-sep-2026)
const NEW_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

// Tarjeta de mercado (grid de Home / Mercados): thumbnail + pregunta arriba,
// probabilidad al centro, meta + Sí/No abajo. Sin sparkline; el único badge
// extra es el sello "Nuevo" de los recién sembrados.
export function MarketCard({ market, animClass = '', onQuickTrade }: MarketCardProps) {
  const { t } = useTranslation()
  const isMulti = market.marketType === 'multi'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'
  const isNew = !isPending && !!market.createdAt && Date.now() - Date.parse(market.createdAt) < NEW_MAX_AGE_MS
  const canQuick = !!onQuickTrade && !isPending
  const pair = displayPair(market.yesPrice)

  const yesColor = market.yesPrice >= 65 ? 'var(--green)' : market.yesPrice <= 35 ? 'var(--red)' : 'var(--text-primary)'

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div
        className="card"
        style={{
          padding: onQuickTrade ? 14 : 16, cursor: 'pointer', height: '100%',
          display: 'flex', flexDirection: 'column', gap: onQuickTrade ? 12 : 14,
          opacity: isPending ? 0.85 : 1,
        }}
      >
        {/* Cabecera: thumbnail + pregunta (+ % en binario compacto) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <MarketThumb market={market} size={40} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1, minWidth: 0 }}>
            {market.question}
          </p>
          {onQuickTrade && !isMulti && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 600, color: yesColor, lineHeight: 1.1 }}>{market.yesPrice}%</div>
              <div className="meta-label" style={{ fontSize: 11 }}>{t('card.chance', { defaultValue: 'Sí' })}</div>
            </div>
          )}
        </div>

        {/* Probabilidad */}
        {isMulti ? (
          <MultiOutcomeList outcomes={market.outcomes ?? []} sub={market.subcategory} marketId={market.id} onQuickTrade={canQuick ? onQuickTrade : undefined} />
        ) : canQuick ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn quick-yes-btn" onClick={quick(() => onQuickTrade!('YES'))} style={{ height: 40, fontWeight: 600 }}>
              {t('common.yes')} <span className="num">{pair.yes}%</span>
            </button>
            <button className="btn quick-no-btn" onClick={quick(() => onQuickTrade!('NO'))} style={{ height: 40, fontWeight: 600 }}>
              {t('common.no')} <span className="num">{pair.no}%</span>
            </button>
          </div>
        ) : !onQuickTrade ? (
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
        ) : null}

        {/* Pie: meta + Sí/No */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 10 }}>
          <div className="meta-label num" style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {/* El sello va primero: el overflow de la fila recorta por la derecha */}
            {isNew && (
              <>
                <Badge tone="accent" icon="sparkle">{t('card.new')}</Badge>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{t('card.vol')} {formatVolume(market.volume)} PT</span>
            <span aria-hidden>·</span>
            {isPending ? (
              <Badge tone="accent">{t('card.waitingResolution')}</Badge>
            ) : (
              <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
            )}
          </div>
          {!isMulti && !isPending && !onQuickTrade && (
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
