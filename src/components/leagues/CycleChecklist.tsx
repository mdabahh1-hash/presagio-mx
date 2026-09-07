/**
 * Checklist de mercados de la jornada.
 *
 * Reglas UX:
 * - Orden por cierre más próximo (ya viene ordenado del backend).
 * - Tres estados por fila: sin pick (botón Predecir), con pick (badge),
 *   cerrado sin pick ("No jugaste").
 * - Línea social "5 de 8 ya predijeron" SIN revelar picks. Al cierre se
 *   vuelve "Ver picks" y abre el reveal inline.
 * - Un solo botón dorado en pantalla: el del siguiente mercado sin pick.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, CycleMarket, RevealRow, leaguesApi } from '../../lib/leaguesApi'
import { formatNum } from '../../lib/format'
import { cleanLabel } from '../../lib/mapMarket'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { MarketThumb } from '../MarketThumb'
import { Countdown } from '../../pages/leagues/InviteLandingPage'
import { cycleMarketToPreview, outcomeLabel } from './adapters'

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

  if (cycle.markets.length === 0) {
    return (
      <section className="card lg-empty">
        <span className="lg-empty__puck">
          <Icon name="list" size={22} />
        </span>
        <p className="lg-empty__title">{t('leagues.checklist.empty')}</p>
      </section>
    )
  }

  return (
    <ul className="card lg-picks">
      {cycle.markets.map(m => (
        <PickRow
          key={m.market_id}
          cycle={cycle}
          market={m}
          memberCount={memberCount}
          highlighted={m.market_id === firstOpen?.market_id}
          onPick={() => onPick(m)}
        />
      ))}
    </ul>
  )
}

function PickRow({
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
    <li className={`list-row lg-pick${highlighted ? ' is-next' : ''}${closed ? ' is-closed' : ''}`}>
      <MarketThumb market={cycleMarketToPreview(market)} size={40} radius={8} />

      <div className="lg-pick__body">
        <p className="lg-pick__q">{cleanLabel(market.question)}</p>
        <div className="lg-pick__meta meta-label">
          {market.is_open ? <Countdown to={market.closes_at} /> : <span>{t('leagues.market.closed')}</span>}
          {!closed && (
            <span className="num">{t('leagues.market.predicted', { n: market.predicted_count, m: memberCount })}</span>
          )}
          {closed && (
            <button type="button" className="btn btn-ghost btn-sm lg-pick__reveal" onClick={toggleReveal} disabled={loadingReveal}>
              {reveal ? t('leagues.market.hidePicks') : t('leagues.market.seePicks')}
              <Icon name={reveal ? 'chevron-up' : 'chevron-down'} size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="lg-pick__action">
        {mp ? (
          <MyPickBadge mp={mp} market={market} />
        ) : market.is_open ? (
          <button type="button" className={`btn btn-sm ${highlighted ? 'btn-primary' : 'btn-secondary'}`} onClick={onPick}>
            {t('leagues.market.predict')}
          </button>
        ) : (
          <span className="meta-label">{t('leagues.market.missed')}</span>
        )}
      </div>

      {/* reveal inline: miembro → selección → stake (orden del backend) */}
      {reveal && (
        <ul className="lg-reveal">
          {reveal.map(r => (
            <li key={r.user_id} className={`list-row lg-reveal__row is-${r.status}`}>
              <Avatar name={r.display_name} size={28} />
              <span className="lg-reveal__name">{r.display_name}</span>
              <span className="lg-reveal__sel">{r.selection_label}</span>
              <span className="meta-label num lg-reveal__stake">{formatNum(Number(r.stake))} pts</span>
              {r.status === 'won' && r.payout && (
                <span className="lg-reveal__payout num">+{formatNum(Number(r.payout))}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function MyPickBadge({ mp, market }: { mp: NonNullable<CycleMarket['my_prediction']>; market: CycleMarket }) {
  const { t } = useTranslation()
  const label =
    mp.binary_side !== null
      ? mp.binary_side === 'yes'
        ? t('common.yes')
        : t('common.no')
      : (() => {
          const o = market.outcomes.find(x => x.id === mp.outcome_id)
          return o ? outcomeLabel(o) : '—'
        })()
  const tone = mp.status === 'won' ? 'green' : mp.status === 'lost' ? 'red' : 'neutral'
  const icon = mp.status === 'won' ? 'check' : mp.status === 'lost' ? 'x' : mp.status === 'void' ? 'ban' : 'lock'

  return (
    <Badge tone={tone} icon={icon}>
      <span className="num">
        {label} · {formatNum(Number(mp.stake))}
        {mp.status === 'won' && mp.payout ? ` → +${formatNum(Number(mp.payout))}` : ''}
      </span>
    </Badge>
  )
}
