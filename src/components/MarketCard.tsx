import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market, Outcome } from '../types'
import { formatVolume, formatCountdown } from '../lib/format'
import { cleanLabel } from '../lib/mapMarket'
import { useCountdown } from '../lib/useCountdown'
import { displayPair, probColor, probText } from '../lib/prices'
import { orderOutcomes, is1x2, matchOutcomes } from '../lib/outcomeOrder'
import { outcomeLogo } from '../lib/teamLogos'
import { useFitText, ESCALONES, ESCALONES_MOVIL } from '../lib/useFitText'
import { useMobile } from '../lib/useMobile'
import { isNewMarket } from '../lib/newMarkets'
import { MarketThumb } from './MarketThumb'
import { TeamMark, DrawMark } from './TeamMark'
import { outcomeColor } from './SparkChart'
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

const ELLIPSIS = { minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const

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
        <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{probText(pct)}</div>
        <div className="meta-label" style={{ fontSize: 11 }}>{label}</div>
      </div>
    </div>
  )
}

// Dos opciones con chips Sí/No. Sin onQuickTrade (pendiente) van sin chips, con
// las mismas filas, para que la tarjeta siga midiendo igual.
function ChipOutcomeList({ outcomes, sub, marketId, onQuickTrade }: { outcomes: Outcome[]; sub?: string | null; marketId: string; onQuickTrade?: QuickTradeHandler }) {
  const { t } = useTranslation()
  // Dos opciones, sin «+N más»: no cabe en el alto fijo y Polymarket tampoco lo
  // muestra. El resto de las opciones están a un toque, en el detalle.
  const top = orderOutcomes(outcomes).slice(0, 2)
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
          <span title={o.label} style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, ...ELLIPSIS }}>
            {o.label}
          </span>
          <span className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: 38, textAlign: 'right', flexShrink: 0 }}>
            {probText(o.price)}
          </span>
          {onQuickTrade && (
            <>
              <OutcomeChip side="YES" label={t('common.yes')} onClick={quick(() => onQuickTrade('YES', o.outcome_key))} />
              <OutcomeChip side="NO" label={t('common.no')} onClick={quick(() => onQuickTrade('NO', o.outcome_key))} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// Partido (kind 'partido'): en vez de la pregunta, una fila por equipo (local
// arriba) y abajo un botón por opción. El bloque de equipos ocupa todo el espacio
// que le deja la tarjeta, así que los escudos y los nombres van en grande.
function MatchTeams({ teams, sub, marketId }: { teams: Outcome[]; sub?: string | null; marketId: string }) {
  const hasMarks = teams.some(o => outcomeLogo(o, sub, marketId))
  return (
    <div className="market-card-teams">
      {teams.map(o => (
        <div key={o.outcome_key} className="market-card-team">
          {hasMarks && (
            <span style={{ width: 28, height: 28, flexShrink: 0, display: 'inline-flex' }}>
              <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={sub} marketId={marketId} size={28} />
            </span>
          )}
          <span className="market-card-team-name" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', flex: 1, ...ELLIPSIS }}>{cleanLabel(o.label)}</span>
          <span className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
            {probText(o.price)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MarketCard({ market, animClass = '', onQuickTrade }: MarketCardProps) {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const isMulti = market.marketType === 'multi'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)
  const isPending = market.status === 'pending_resolution'
  const isNew = isNewMarket(market)
  const pair = displayPair(market.yesPrice)
  const outcomes = market.outcomes ?? []
  const match = matchOutcomes(market)
  // El título se ajusta solo a la cabecera: 15 → 14 → 13 px, y las líneas que
  // quepan (tope de la caja). Un partido no lleva título.
  const tituloRef = useFitText<HTMLParagraphElement>(market.question, isMobile ? ESCALONES_MOVIL : ESCALONES)

  // El tono medio va en gris (handoff), no en el color del texto.
  const gaugeColor = probColor(pair.yes) === 'var(--text-primary)' ? 'var(--text-secondary)' : probColor(pair.yes)
  // Color de cada equipo: el mismo que le da la gráfica del detalle (outcomeColor
  // sobre la lista ordenada completa), para que no cambie entre tarjeta y detalle.
  const order = match ? orderOutcomes(outcomes) : []
  const teamColor = (key: string) => outcomeColor(order.findIndex(o => o.outcome_key === key))

  return (
    <Link to={`/mercado/${market.id}`} style={{ textDecoration: 'none' }} className={animClass}>
      <div className={`card market-card${isMulti && !match ? ' market-card--multi' : ''}`} title={match ? market.question : undefined} style={{ opacity: isPending ? 0.85 : 1 }}>
        {match ? (
          <MatchTeams teams={[match.local, match.visitante]} sub={market.subcategory} marketId={market.id} />
        ) : (
          /* Cabecera: thumbnail + pregunta (+ medidor en binario). Se queda con
             todo el espacio que sobra y el título se ajusta a él. */
          <div className="market-card-head">
            <MarketThumb market={market} size={isMobile ? 36 : 40} />
            <p ref={tituloRef} className="market-card-title" title={market.question}>
              {market.question}
            </p>
            {!isMulti && <Gauge pct={pair.yes} color={gaugeColor} label={t('card.chance', { defaultValue: 'Sí' })} />}
          </div>
        )}

        {isMulti && !match && <ChipOutcomeList outcomes={outcomes} sub={market.subcategory} marketId={market.id} onQuickTrade={isPending ? undefined : onQuickTrade} />}

        {isPending ? (
          /* Pendiente: una barra donde iría la compra, para no dejar hueco */
          <div className="market-card-pending">{t('card.waitingResolution')}</div>
        ) : match ? (
          <div className="market-card-buy" style={{ gridTemplateColumns: `repeat(${match.empate ? 3 : 2}, 1fr)` }}>
            {[match.local, match.empate, match.visitante].map(o => o && (
              <button
                key={o.outcome_key}
                className="btn"
                onClick={quick(() => onQuickTrade('YES', o.outcome_key))}
                style={{
                  height: 40, padding: '0 8px', fontSize: 13, fontWeight: 600, minWidth: 0,
                  ...(o === match.empate
                    ? { color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }
                    : { color: teamColor(o.outcome_key), background: `color-mix(in srgb, ${teamColor(o.outcome_key)} 14%, transparent)` }),
                }}
              >
                <span style={ELLIPSIS}>{cleanLabel(o.label)}</span>
              </button>
            ))}
          </div>
        ) : isMulti ? null : (
          <div className="market-card-buy">
            <button className="btn price-yes" onClick={quick(() => onQuickTrade('YES'))} style={{ height: 40, padding: 0, fontSize: 14, fontWeight: 600 }}>
              {t('common.yes')}
            </button>
            <button className="btn price-no" onClick={quick(() => onQuickTrade('NO'))} style={{ height: 40, padding: 0, fontSize: 14, fontWeight: 600 }}>
              {t('common.no')}
            </button>
          </div>
        )}

        {/* Pie en un renglón. Si no cabe cede primero el volumen (y la liga), luego el sello; el cierre nunca.
            En un pendiente el aviso ya está en la barra, así que aquí no se repite. */}
        <div className="meta-label num market-card-foot">
          {isNew && (
            <>
              <span className="market-card-foot-new"><Badge tone="accent" icon="sparkle">{t('card.new')}</Badge></span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="market-card-foot-vol">{t('card.vol')} {formatVolume(market.volume)} PT</span>
          {match && market.subcategory && (
            <>
              <span aria-hidden>·</span>
              <span className="market-card-foot-liga">{market.subcategory}</span>
            </>
          )}
          {!isPending && (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
