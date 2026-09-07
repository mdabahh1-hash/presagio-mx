/**
 * PickSheet — bottom sheet para hacer el pick. El corazón del flujo.
 *
 * Orden del contenido (no cambiar, está diseñado como funnel):
 * 1. Pregunta + cierre absoluto
 * 2. Opciones como tiles con probabilidad ("América · 42%")
 * 3. Stake: chips 500/1000/2500/5000 + campo editable, default 1000,
 *    balance restante visible
 * 4. La línea que vende: "Si aciertas ganas 2,380 pts" en vivo (cap 20x)
 * 5. Confirmar + leyenda "Los picks no se pueden cambiar"
 *
 * Usa el bottom sheet del sitio (.sheet-overlay/.sheet-panel de index.css):
 * Escape cierra y el body no scrollea mientras está abierto.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, CycleMarket, leaguesApi, potentialPayout, STAKE_CHIPS } from '../../lib/leaguesApi'
import { formatNum } from '../../lib/format'
import { cleanLabel } from '../../lib/mapMarket'
import { Icon } from '../Icon'
import { outcomeLabel } from './adapters'

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

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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

  const options: Array<{ key: string; label: string; price: number; select: () => void; active: boolean }> =
    market.market_type === 'binary'
      ? (['yes', 'no'] as const).map(side => {
          const o = market.outcomes.find(x => x.side === side)
          const price = o ? Number(o.price) : 0.5
          const label = side === 'yes' ? t('common.yes') : t('common.no')
          return {
            key: side,
            label,
            price,
            active: sel?.kind === 'binary' && sel.side === side,
            select: () => setSel({ kind: 'binary', side, price, label }),
          }
        })
      : market.outcomes.map(o => {
          const price = Number(o.price)
          const label = outcomeLabel(o)
          return {
            key: String(o.id),
            label,
            price,
            active: sel?.kind === 'multi' && sel.outcomeId === o.id,
            select: () => setSel({ kind: 'multi', outcomeId: o.id!, price, label }),
          }
        })

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet-panel lg-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={cleanLabel(market.question)}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-handle" />

        {/* 1. pregunta + cierre */}
        <p className="lg-sheet__q">{cleanLabel(market.question)}</p>
        <p className="meta-label lg-sheet__closes">{t('leagues.sheet.closes', { when: closesAbs })}</p>

        {/* 2. opciones */}
        <div className={`lg-tiles lg-options${options.length === 2 ? ' lg-options--two' : ''}`}>
          {options.map(o => (
            <button key={o.key} type="button" className={`lg-tile${o.active ? ' is-active' : ''}`} aria-pressed={o.active} onClick={o.select}>
              <span className="lg-tile__text">
                <span className="lg-tile__name">{o.label}</span>
                <span className="lg-tile__count num">{Math.round(o.price * 100)}%</span>
              </span>
              {o.active && <Icon name="check" size={14} className="lg-tile__check" />}
            </button>
          ))}
        </div>

        {/* 3. stake */}
        <div className="lg-stake">
          <div className="lg-presets">
            {STAKE_CHIPS.map(c => (
              <button
                key={c}
                type="button"
                className={`lg-preset${stake === c ? ' is-active' : ''}`}
                aria-pressed={stake === c}
                disabled={c > balance}
                onClick={() => setStake(c)}
              >
                <span className="num">{formatNum(c)}</span>
              </button>
            ))}
          </div>
          <div className="lg-stake__custom">
            <input
              type="number"
              className="input num"
              inputMode="numeric"
              min={100}
              max={balance}
              step={100}
              value={stake}
              onChange={e => setStake(Number(e.target.value))}
              aria-label={t('leagues.sheet.stakeAria')}
            />
            <span className="meta-label num">{t('leagues.sheet.balance', { n: formatNum(balance) })}</span>
          </div>
          {stakeInvalid && (
            <p className="lg-form__error">{stake < 100 ? t('leagues.sheet.minStake') : t('leagues.sheet.maxStake')}</p>
          )}
        </div>

        {/* 4. la línea que vende */}
        <div className="card lg-payout" aria-live="polite">
          {sel ? (
            <>
              <span className="meta-label">{t('leagues.sheet.ifYouWin')}</span>
              <span className="lg-payout__value num">+{formatNum(Math.floor(payout))} pts</span>
              {capped && <span className="meta-label">{t('leagues.sheet.cap')}</span>}
            </>
          ) : (
            <span className="meta-label">{t('leagues.sheet.pickFirst')}</span>
          )}
        </div>

        {error && <p className="lg-form__error">{error}</p>}

        {/* 5. confirmar */}
        <button
          type="button"
          className="btn btn-primary btn-lg lg-form__cta"
          disabled={!sel || stakeInvalid || submitting}
          onClick={confirm}
        >
          {submitting ? t('common.loading') : t('leagues.sheet.confirm')}
        </button>
        <p className="meta-label lg-sheet__final">{t('leagues.sheet.noChanges')}</p>
      </div>
    </div>
  )
}
