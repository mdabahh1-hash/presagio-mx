/**
 * Checklist de mercados del ciclo.
 *
 * Reglas UX:
 * - Orden por cierre más próximo (ya viene ordenado del backend).
 * - Tres estados por fila: sin pick (botón Predecir), con pick (chip),
 *   cerrado sin pick ("No jugaste" en gris).
 * - Línea social "5 de 8 ya predijeron" SIN revelar picks. Al cierre se
 *   vuelve "Ver picks" y abre el reveal inline.
 * - El primer mercado sin pick aparece resaltado invitando al tap.
 *
 * El bloque de pregunta+probabilidades reusa <MarketRow compact />.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, CycleMarket, RevealRow, leaguesApi } from '../../lib/leaguesApi'
import { MarketRow } from '../MarketRow'
import { Countdown } from '../../pages/leagues/InviteLandingPage'
import type { Market } from '../../types'

export default function CycleChecklist({
  cycle,
  memberCount,
  onPick,
}: {
  cycle: Cycle
  memberCount: number
  onPick: (m: CycleMarket) => void
}) {
  const { t } = useTranslation()
  const firstOpen = cycle.markets.find(m => m.is_open && !m.my_prediction)

  return (
    <ul className="lg-checklist">
      {cycle.markets.map(m => (
        <MarketRowItem
          key={m.market_id}
          cycle={cycle}
          market={m}
          memberCount={memberCount}
          highlighted={m.market_id === firstOpen?.market_id}
          onPick={() => onPick(m)}
        />
      ))}
      {cycle.markets.length === 0 && <li className="lg-empty">{t('leagues.checklist.empty')}</li>}
    </ul>
  )
}

/** Adapta el CycleMarket del backend (precios string 0-1) al Market del UI (0-100). */
function toUiMarket(m: CycleMarket): Market {
  const yes = m.outcomes.find(o => o.side === 'yes')
  return {
    id: m.market_id,
    question: m.question,
    description: '',
    category: 'Deportes',
    yesPrice: Math.round(Number(yes?.price ?? 0.5) * 100),
    volume: 0,
    liquidity: 0,
    endsAt: m.closes_at,
    resolutionCriteria: '',
    trending: false,
    status: 'open',
    marketType: m.market_type,
    outcomes:
      m.market_type === 'multi'
        ? m.outcomes.map(o => ({
            outcome_key: o.outcome_key ?? String(o.id),
            label: o.label ?? '—',
            price: Number(o.price) * 100,
          }))
        : [],
    history: [],
    comments: [],
  }
}

function MarketRowItem({
  cycle,
  market,
  memberCount,
  highlighted,
  onPick,
}: {
  cycle: Cycle
  market: CycleMarket
  memberCount: number
  highlighted: boolean
  onPick: () => void
}) {
  const { t } = useTranslation()
  const [reveal, setReveal] = useState<RevealRow[] | null>(null)
  const [loadingReveal, setLoadingReveal] = useState(false)

  const mp = market.my_prediction
  const closed = !market.is_open

  async function toggleReveal() {
    if (reveal) return setReveal(null)
    setLoadingReveal(true)
    try {
      setReveal(await leaguesApi.reveal(cycle.id, market.market_id))
    } finally {
      setLoadingReveal(false)
    }
  }

  return (
    <li
      className={[
        'lg-market',
        highlighted ? 'lg-market--highlight' : '',
        closed ? 'lg-market--closed' : '',
      ].join(' ')}
    >
      <div className="lg-market__main">
        <MarketRow compact market={toUiMarket(market)} />
        <div className="lg-market__meta">
          {market.is_open ? (
            <Countdown to={market.closes_at} />
          ) : (
            <span className="lg-muted">{t('leagues.market.closed')}</span>
          )}
        </div>

        {/* línea social, nunca revela antes del cierre */}
        {!closed && (
          <span className="lg-social">
            {t('leagues.market.predicted', { n: market.predicted_count, m: memberCount })}
          </span>
        )}
        {closed && (
          <button className="lg-link" onClick={toggleReveal} disabled={loadingReveal}>
            {reveal ? t('leagues.market.hidePicks') : t('leagues.market.seePicks')}
          </button>
        )}
      </div>

      <div className="lg-market__action">
        {mp ? (
          <MyPickChip mp={mp} market={market} />
        ) : market.is_open ? (
          <button className="lg-btn lg-btn--primary" onClick={onPick}>
            {t('leagues.market.predict')}
          </button>
        ) : (
          <span className="lg-muted">{t('leagues.market.missed')}</span>
        )}
      </div>

      {/* reveal inline: miembro -> selección -> stake, orden stake desc */}
      {reveal && (
        <ul className="lg-reveal">
          {reveal.map(r => (
            <li key={r.user_id} className={`lg-reveal__row lg-reveal__row--${r.status}`}>
              <span className="lg-reveal__name">{r.display_name}</span>
              <span className="lg-reveal__sel">{r.selection_label}</span>
              <span className="lg-reveal__stake">{fmt(r.stake)} pts</span>
              {r.status === 'won' && r.payout && (
                <span className="lg-reveal__payout">+{fmt(r.payout)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function MyPickChip({
  mp,
  market,
}: {
  mp: NonNullable<CycleMarket['my_prediction']>
  market: CycleMarket
}) {
  const { t } = useTranslation()
  const label =
    mp.binary_side !== null
      ? mp.binary_side === 'yes'
        ? t('common.yes')
        : t('common.no')
      : (market.outcomes.find(o => o.id === mp.outcome_id)?.label ?? '—')

  return (
    <span className={`lg-chip lg-chip--pick lg-chip--${mp.status}`}>
      {label} · {fmt(mp.stake)}
      {mp.status === 'won' && mp.payout ? ` → +${fmt(mp.payout)}` : ''}
    </span>
  )
}

function fmt(n: string | number): string {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
}
