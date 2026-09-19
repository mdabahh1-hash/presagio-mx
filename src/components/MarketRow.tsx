import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LiveState, Market, PricePoint } from '../types'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'
import { formatVolume, formatCountdown } from '../lib/format'
import { useCountdown } from '../lib/useCountdown'
import { outcomeLogo } from '../lib/teamLogos'
import { orderOutcomes } from '../lib/outcomeOrder'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { Badge } from './Badge'
import { SparkChart } from './SparkChart'

// Columna de hora/estado de la pista fija (52 px en desktop; en móvil va inline en la meta)
export interface RowLead {
  primary: string
  secondary?: string | null
  tone?: 'default' | 'live'
}

interface MarketRowProps {
  market: Market
  animClass?: string
  // Variante compacta (checklist de ligas): solo pregunta + probabilidades,
  // sin Link, sin badges ni meta — el contenedor pone su propio contexto.
  compact?: boolean
  // La fila vive dentro de una sección titulada con su subcategoría: el badge
  // repetiría el encabezado.
  hideSubcategory?: boolean
  // Sin badge alguno (la landing de una categoría ya da el contexto)
  hideBadge?: boolean
  // Padding vertical de la fila (landing de Política usa 14px)
  padding?: string
  // Sparkline antes de los chips Sí/No. undefined = sin hueco (uso actual);
  // null o < 2 puntos = hueco reservado vacío (evita saltos al cargar).
  spark?: PricePoint[] | null
  // Tercer dato de la meta (fuente o umbral en corto), con elipsis
  extraMeta?: string | null
  // Pista de resultados de ancho fijo (landing de Deportes): N pistas de 158 px
  // pegadas a la derecha; un binario (2) y un 1X2 (3) alinean su último chip.
  // Con más de 3 opciones: dos líderes + "+N más" en la tercera pista.
  fixedTrack?: boolean
  // Número de pistas que reserva la fila (3 = 486 px; 2 = 322 px en accesorios)
  trackSlots?: number
  // Columna de hora/estado antes del thumb; solo con fixedTrack
  lead?: RowLead | null
  // Badges extra junto al de subcategoría (En vivo, Cierra pronto, Accesorio)
  badges?: React.ReactNode
  // Marcador y minuto del partido; un partido en juego está "por resolverse"
  // (cierra al kickoff) pero se muestra vivo, sin la opacidad de pendiente.
  live?: LiveState | null
  // Tamaño del thumb (36 en la tarjeta de accesorios)
  thumbSize?: number
}

// Fila estilo Polymarket: thumbnail + pregunta + meta a la izquierda,
// probabilidades a la derecha. Es una fila de lista (divisor), no una tarjeta.
// Toda la fila es un Link al mercado.
export function MarketRow({
  market, animClass = '', compact = false, hideSubcategory = false, hideBadge = false, padding = '12px 0',
  spark, extraMeta = null, fixedTrack = false, trackSlots = 3, lead = null, badges = null, live = null, thumbSize = 56,
}: MarketRowProps) {
  const { t } = useTranslation()
  const isMulti = market.marketType === 'multi'
  const isPending = market.status === 'pending_resolution'
  const isLive = live?.estado === 'LIVE'
  const diff = useCountdown(market.endsAt)
  const { text: countdownText, urgent } = formatCountdown(diff)

  const sortedOutcomes = isMulti ? orderOutcomes(market.outcomes ?? []) : []
  const topOutcomes = sortedOutcomes.slice(0, 3)
  const restOutcomes = sortedOutcomes.length - topOutcomes.length
  // Si algún resultado tiene escudo, toda la fila usa el chip horizontal
  const hasMarks = isMulti && sortedOutcomes.some(o => outcomeLogo(o, market.subcategory, market.id))
  const chipCls = `row-outcome-btn${hasMarks ? ' row-outcome-btn--mark' : ''}`

  const outcomesBlock = (
    <div className="market-row-outcomes">
      {isMulti ? (
        <>
          {topOutcomes.map(o => (
            <div key={o.outcome_key} className={chipCls} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              {hasMarks && <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={18} />}
              <span className="row-outcome-label" title={o.label}>{o.label}</span>
              <span className="row-outcome-price">{Math.round(o.price)}%</span>
            </div>
          ))}
          {restOutcomes > 0 && (
            <div className="row-outcome-btn" style={{ minWidth: 0, background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>
              +{restOutcomes}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="row-outcome-btn price-yes">
            <span className="row-outcome-label">{t('common.yes')}</span>
            <span className="row-outcome-price">{market.yesPrice}%</span>
          </div>
          <div className="row-outcome-btn price-no">
            <span className="row-outcome-label">{t('common.no')}</span>
            <span className="row-outcome-price">{100 - market.yesPrice}%</span>
          </div>
        </>
      )}
    </div>
  )

  // Pista fija: nunca más de 3 pistas (2 líderes + "+N más" si hay más de 3 opciones)
  const trackChips = sortedOutcomes.length > 3 ? sortedOutcomes.slice(0, 2) : sortedOutcomes
  const trackRest = sortedOutcomes.length > 3 ? sortedOutcomes.length - 2 : 0
  const trackCount = isMulti ? trackChips.length + (trackRest ? 1 : 0) : 2
  const trackBlock = (
    <div className="market-row-track" style={{ '--n': trackCount } as React.CSSProperties}>
      {isMulti ? (
        <>
          {trackChips.map(o => (
            <div key={o.outcome_key} className="row-outcome-btn row-outcome-btn--track" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              {hasMarks && <TeamMark label={o.label} outcomeKey={o.outcome_key} sub={market.subcategory} marketId={market.id} size={18} />}
              <span className="row-outcome-label" title={o.label}>{o.label}</span>
              <span className="row-outcome-price">{Math.round(o.price)}%</span>
            </div>
          ))}
          {trackRest > 0 && (
            <div className="row-outcome-btn row-outcome-btn--track row-outcome-btn--rest">{t('card.more', { count: trackRest })}</div>
          )}
        </>
      ) : (
        <>
          <div className="row-outcome-btn row-outcome-btn--track price-yes">
            <span className="row-outcome-label">{t('common.yes')}</span>
            <span className="row-outcome-price">{market.yesPrice}%</span>
          </div>
          <div className="row-outcome-btn row-outcome-btn--track price-no">
            <span className="row-outcome-label">{t('common.no')}</span>
            <span className="row-outcome-price">{100 - market.yesPrice}%</span>
          </div>
        </>
      )}
    </div>
  )

  // Sube/baja/plano en la ventana del sparkline (1 pp = mismo corte que movers)
  const sparkDelta = spark && spark.length >= 2 ? spark[spark.length - 1].price - spark[0].price : 0
  const sparkColor = sparkDelta > 1 ? 'var(--green)' : sparkDelta < -1 ? 'var(--red)' : 'var(--text-tertiary)'
  const rightBlock = fixedTrack ? trackBlock : spark === undefined ? outcomesBlock : (
    <div className="market-row-right">
      <div className="market-row-spark">
        {spark && spark.length >= 2 && <SparkChart data={spark} width={90} height={32} showArea={false} color={sparkColor} />}
      </div>
      {outcomesBlock}
    </div>
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <p className="market-row-title" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>
          {market.question}
        </p>
        {outcomesBlock}
      </div>
    )
  }

  const badgeLabel = hideBadge || (hideSubcategory && market.subcategory) ? null : (market.subcategory ?? market.category)
  const rowCls = [
    'list-row is-link market-row',
    fixedTrack ? 'market-row--track' : '',
    fixedTrack && !lead ? 'market-row--nolead' : '',
    animClass,
  ].filter(Boolean).join(' ')
  const trackVars = fixedTrack
    ? ({ '--track-w': `${158 * trackSlots + 6 * (trackSlots - 1)}px`, '--thumb-w': `${thumbSize}px` } as React.CSSProperties)
    : undefined
  const marcador = live && live.marcadorLocal !== null && live.marcadorVisitante !== null
    ? `${live.marcadorLocal} - ${live.marcadorVisitante}`
    : null

  return (
    <Link
      to={`/mercado/${market.id}`}
      className={rowCls}
      style={{ padding, opacity: isPending && !isLive ? 0.8 : 1, ...trackVars }}
    >
      {fixedTrack && lead && (
        <div className="market-row-lead">
          <div className="market-row-lead-primary num" style={{ color: lead.tone === 'live' ? 'var(--green)' : undefined }}>{lead.primary}</div>
          {lead.secondary && <div className="market-row-lead-secondary">{lead.secondary}</div>}
        </div>
      )}
      <MarketThumb market={market} size={thumbSize} className="market-row-thumb" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {(badgeLabel || badges) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {badgeLabel && <Badge tone="category" color={getCategoryColor(market.category)} bg={getCategoryBg(market.category)}>{badgeLabel}</Badge>}
            {badges}
          </div>
        )}
        <p className="market-row-title" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>
          {market.question}
        </p>
        <div className="meta-label num" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {lead && (
            <span className="market-row-lead-meta" style={{ color: lead.tone === 'live' ? 'var(--green)' : 'var(--text-primary)', fontWeight: 600 }}>
              {lead.primary}{lead.secondary ? ` · ${lead.secondary}` : ''}<span aria-hidden> ·</span>
            </span>
          )}
          {marcador && (
            <>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{marcador}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{t('card.vol')} {formatVolume(market.volume)} PT</span>
          <span aria-hidden>·</span>
          {isLive ? (
            <span style={{ color: 'var(--green)', fontWeight: 500 }}>{t('common.live')}</span>
          ) : isPending ? (
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{t('card.waitingResolution')}</span>
          ) : (
            <span style={{ color: urgent ? 'var(--red)' : undefined, fontWeight: urgent ? 600 : 500 }}>{countdownText}</span>
          )}
          {extraMeta && (
            <>
              <span aria-hidden>·</span>
              <span style={{ minWidth: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={extraMeta}>{extraMeta}</span>
            </>
          )}
        </div>
      </div>

      {rightBlock}
    </Link>
  )
}
