import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, Outcome } from '../types'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'
import { displayPair, probColor } from '../lib/prices'
import { orderOutcomes, is1x2 } from '../lib/outcomeOrder'
import { outcomeLogo } from '../lib/teamLogos'
import { useMobile } from '../lib/useMobile'
import { isNewMarket } from '../lib/newMarkets'
import { MarketThumb } from './MarketThumb'
import { TeamMark, DrawMark } from './TeamMark'
import { Badge } from './Badge'

export type QuickTradeHandler = (side: 'YES' | 'NO', outcomeKey?: string) => void

interface MarketCardProps {
  market: Market
  animClass?: string
  // Sí/No abren la compra sin navegar (MarketGrid monta el TradeSheet)
  onQuickTrade: QuickTradeHandler
}

// Evita que el botón dispare el Link de la tarjeta
const quick = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn() }

// Chip Sí/No de una opción (46×28). El contenedor de la fila da el alto táctil.
function OutcomeChip({ side, onClick, label }: { side: 'YES' | 'NO'; onClick: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      className={`btn ${side === 'YES' ? 'price-yes' : 'price-no'}`}
      onClick={onClick}
      style={{ width: 46, height: 28, padding: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
    >
      {label}
    </button>
  )
}

// Medidor de medio círculo (binaria con chips, como Polymarket): % dentro del arco
function Gauge({ pct, color, label }: { pct: number; color: string; label: string }) {
  const arc = 'M 5 33 A 27 27 0 0 1 59 33'
  return (
    <div style={{ position: 'relative', width: 64, height: 46, flexShrink: 0, textAlign: 'center' }}>
      <svg width="64" height="36" viewBox="0 0 64 36" aria-hidden style={{ display: 'block' }}>
        <path d={arc} fill="none" stroke="var(--border-subtle)" strokeWidth="4" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 17, lineHeight: 1.1 }}>
        <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</div>
        <div className="meta-label" style={{ fontSize: 11 }}>{label}</div>
      </div>
    </div>
  )
}

// Hasta 3 opciones (un 1X2 cabe completo, en su orden fijo) + «+N más». Sin
// onQuickTrade (pendiente de resolución) las filas van sin chips.
function ChipOutcomeList({ outcomes, sub, marketId, onQuickTrade }: { outcomes: Outcome[]; sub?: string | null; marketId: string; onQuickTrade?: QuickTradeHandler }) {
  const { t } = useTranslation()
  const sorted = orderOutcomes(outcomes)
  const top = sorted.slice(0, 3)
  const rest = sorted.length - top.length
  // Si alguna fila lleva escudo o cara, las que no («Otro») reservan su hueco; el
  // Empate de un 1X2 lleva su marca neutral
  const hasMarks = top.some(o => outcomeLogo(o, sub, marketId))
  const x12 = is1x2(outcomes)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {top.map(o => (
        <div key={o.outcome_key} className="market-card-row">
          {hasMarks && (
            <span style={{ width: 18, height: 18, flexShrink: 0, display: 'inline-flex' }}>
              {x12 && o.outcome_key === 'empate'
                ? <DrawMark size={18} />
                : <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={sub} marketId={marketId} size={18} />}
            </span>
          )}
          <span title={o.label} style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {o.label}
          </span>
          <span className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: 38, textAlign: 'right', flexShrink: 0 }}>
            {Math.round(o.price)}%
          </span>
          {onQuickTrade && (
            <>
              <OutcomeChip side="YES" label={t('common.yes')} onClick={quick(() => onQuickTrade('YES', o.outcome_key))} />
              <OutcomeChip side="NO" label={t('common.no')} onClick={quick(() => onQuickTrade('NO', o.outcome_key))} />
            </>
          )}
        </div>
      ))}
      {rest > 0 && <span className="meta-label">{t('card.more', { count: rest })}</span>}
    </div>
  )
}

// Tarjeta de mercado única del sitio (estilo Polymarket): thumbnail + pregunta a
// 3 líneas, medidor (binaria) o hasta 3 opciones con chips (multi), Sí/No que
// abren la compra y pie con sello «Nuevo», volumen y cierre. Las medidas que
// dependen del número de columnas viven en index.css (.market-card*).
export function MarketCard({ market, animClass = '', onQuickTrade }: MarketCardProps) {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const isMulti = market.marketType === 'multi'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'
  const isNew = isNewMarket(market)
  const pair = displayPair(market.yesPrice)

  // El tono medio va en gris (handoff), no en el color del texto.
  const gaugeColor = probColor(pair.yes) === 'var(--text-primary)' ? 'var(--text-secondary)' : probColor(pair.yes)

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div className="card market-card" style={{ opacity: isPending ? 0.85 : 1 }}>
        {/* Cabecera: thumbnail + pregunta (+ medidor en binario) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <MarketThumb market={market} size={isMobile ? 36 : 40} />
          <p
            title={market.question}
            style={{
              margin: 0, fontSize: isMobile ? 14 : 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1, minWidth: 0,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {market.question}
          </p>
          {!isMulti && <Gauge pct={pair.yes} color={gaugeColor} label={t('card.chance', { defaultValue: 'Sí' })} />}
        </div>

        {isMulti ? (
          <ChipOutcomeList outcomes={market.outcomes ?? []} sub={market.subcategory} marketId={market.id} onQuickTrade={isPending ? undefined : onQuickTrade} />
        ) : !isPending && (
          <div className="market-card-buy">
            <button className="btn price-yes" onClick={quick(() => onQuickTrade('YES'))} style={{ height: 40, padding: 0, fontSize: 14, fontWeight: 600 }}>
              {t('common.yes')}
            </button>
            <button className="btn price-no" onClick={quick(() => onQuickTrade('NO'))} style={{ height: 40, padding: 0, fontSize: 14, fontWeight: 600 }}>
              {t('common.no')}
            </button>
          </div>
        )}

        {/* Pie en un renglón. Si no cabe cede primero el volumen, luego el sello; el cierre nunca */}
        <div className="meta-label num market-card-foot">
          {isNew && (
            <>
              <span className="market-card-foot-new"><Badge tone="accent" icon="sparkle">{t('card.new')}</Badge></span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="market-card-foot-vol">{t('card.vol')} {formatVolume(market.volume)} PT</span>
          <span aria-hidden>·</span>
          {isPending ? (
            <Badge tone="accent">{t('card.waitingResolution')}</Badge>
          ) : (
            <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
