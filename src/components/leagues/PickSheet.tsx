/**
 * PickSheet — bottom sheet para hacer el pick. El corazón del flujo.
 *
 * Orden del contenido (no cambiar, está diseñado como funnel):
 * 1. Pregunta + cierre absoluto
 * 2. Outcomes como botones grandes con probabilidad ("América 42%")
 * 3. Stake: chips 500/1000/2500/5000 + campo editable, default 1000,
 *    balance restante visible
 * 4. La línea que vende: "Si aciertas ganas 2,380 pts" en vivo (cap 20x)
 * 5. Confirmar + leyenda "Los picks no se pueden cambiar"
 *
 * Al confirmar: feedback inmediato, cerrar, y el caller auto-avanza al
 * siguiente mercado sin pick.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, CycleMarket, leaguesApi, potentialPayout, STAKE_CHIPS } from '../../lib/leaguesApi'

type Selection =
  | { kind: 'binary'; side: 'yes' | 'no'; price: number; label: string }
  | { kind: 'multi'; outcomeId: number; price: number; label: string }

export default function PickSheet({
  cycle,
  market,
  onClose,
  onPicked,
}: {
  cycle: Cycle
  market: CycleMarket
  onClose: () => void
  onPicked: () => void
}) {
  const { t } = useTranslation()
  const balance = Number(cycle.my_balance ?? 0)

  const [sel, setSel] = useState<Selection | null>(null)
  const [stake, setStake] = useState<number>(Math.min(1000, balance))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payout = useMemo(() => (sel ? potentialPayout(stake, sel.price) : 0), [sel, stake])
  const capped = sel ? stake / sel.price > stake * 20 : false

  const stakeInvalid = stake < 100 || stake > balance

  async function confirm() {
    if (!sel || stakeInvalid) return
    setSubmitting(true)
    setError(null)
    try {
      await leaguesApi.predict(cycle.id, {
        market_id: market.market_id,
        ...(sel.kind === 'binary' ? { binary_side: sel.side } : { outcome_id: sel.outcomeId }),
        stake,
      })
      onPicked()
    } catch (e) {
      // el cliente ya traduce {code, message}; PRICE_MOVED style retry
      setError((e as Error)?.message ?? t('common.error'))
      setSubmitting(false)
    }
  }

  const closesAbs = new Date(market.closes_at).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="lg-sheet__backdrop" onClick={onClose}>
      <div className="lg-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="lg-sheet__handle" />

        {/* 1. pregunta + cierre */}
        <p className="lg-sheet__q">{market.question}</p>
        <p className="lg-sheet__closes">{t('leagues.sheet.closes', { when: closesAbs })}</p>

        {/* 2. outcomes grandes con probabilidad */}
        <div className={`lg-outcomes ${market.market_type === 'binary' ? 'lg-outcomes--binary' : ''}`}>
          {market.market_type === 'binary'
            ? (['yes', 'no'] as const).map(side => {
                const o = market.outcomes.find(x => x.side === side)
                const price = o ? Number(o.price) : 0.5
                const label = side === 'yes' ? t('common.yes') : t('common.no')
                const active = sel?.kind === 'binary' && sel.side === side
                return (
                  <OutcomeButton
                    key={side}
                    label={label}
                    price={price}
                    active={active}
                    onClick={() => setSel({ kind: 'binary', side, price, label })}
                  />
                )
              })
            : market.outcomes.map(o => {
                const price = Number(o.price)
                const active = sel?.kind === 'multi' && sel.outcomeId === o.id
                return (
                  <OutcomeButton
                    key={o.id}
                    label={o.label ?? '—'}
                    price={price}
                    active={active}
                    onClick={() =>
                      setSel({ kind: 'multi', outcomeId: o.id!, price, label: o.label ?? '—' })
                    }
                  />
                )
              })}
        </div>

        {/* 3. stake */}
        <div className="lg-stake">
          <div className="lg-stake__chips">
            {STAKE_CHIPS.map(c => (
              <button
                key={c}
                className={`lg-chip lg-chip--stake ${stake === c ? 'is-active' : ''}`}
                disabled={c > balance}
                onClick={() => setStake(c)}
              >
                {c.toLocaleString('es-MX')}
              </button>
            ))}
          </div>
          <div className="lg-stake__custom">
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={balance}
              step={100}
              value={stake}
              onChange={e => setStake(Number(e.target.value))}
              aria-label={t('leagues.sheet.stakeAria')}
            />
            <span className="lg-stake__balance">
              {t('leagues.sheet.balance', { n: balance.toLocaleString('es-MX') })}
            </span>
          </div>
          {stakeInvalid && (
            <p className="lg-error">
              {stake < 100 ? t('leagues.sheet.minStake') : t('leagues.sheet.maxStake')}
            </p>
          )}
        </div>

        {/* 4. la línea que vende */}
        <div className="lg-payout" aria-live="polite">
          {sel ? (
            <>
              <span className="lg-payout__label">{t('leagues.sheet.ifYouWin')}</span>
              <span className="lg-payout__value">
                {Math.floor(payout).toLocaleString('es-MX')} pts
              </span>
              {capped && <span className="lg-payout__cap">{t('leagues.sheet.cap')}</span>}
            </>
          ) : (
            <span className="lg-payout__label lg-muted">{t('leagues.sheet.pickFirst')}</span>
          )}
        </div>

        {error && <p className="lg-error">{error}</p>}

        {/* 5. confirmar */}
        <button
          className="lg-btn lg-btn--primary lg-btn--xl"
          disabled={!sel || stakeInvalid || submitting}
          onClick={confirm}
        >
          {submitting ? t('common.loading') : t('leagues.sheet.confirm')}
        </button>
        <p className="lg-sheet__final">{t('leagues.sheet.noChanges')}</p>
      </div>
    </div>
  )
}

function OutcomeButton({
  label,
  price,
  active,
  onClick,
}: {
  label: string
  price: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`lg-outcome ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="lg-outcome__label">{label}</span>
      <span className="lg-outcome__price">{Math.round(price * 100)}%</span>
    </button>
  )
}
