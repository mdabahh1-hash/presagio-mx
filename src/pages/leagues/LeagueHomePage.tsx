/**
 * #/ligas/:id — Home de la liga.
 *
 * Reglas UX:
 * - Header con nombre, ciclo con countdown y "Vas 3° de 8".
 * - Tab Picks default: checklist ordenado por cierre próximo, barra
 *   "Te faltan N picks", línea social "5 de 8 ya predijeron" sin revelar.
 * - Tab Tabla: standings en vivo, mi fila resaltada, nota "provisional".
 * - Estados: pending (compartir), scoring (expectativa concreta),
 *   resolved (podio + compartir + siguiente ciclo a un tap).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CycleMarket, LeagueDetail, leaguesApi, shareOnWhatsApp } from '../../lib/leaguesApi'
import { useAuth } from '../../lib/AuthContext'
import { Countdown } from './InviteLandingPage'
import CycleChecklist from '../../components/leagues/CycleChecklist'
import StandingsTable from '../../components/leagues/StandingsTable'
import CycleResultCard from '../../components/leagues/CycleResultCard'
import PickSheet from '../../components/leagues/PickSheet'

export default function LeagueHomePage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [tab, setTab] = useState<'picks' | 'tabla'>('picks')
  const [pickMarket, setPickMarket] = useState<CycleMarket | null>(null)
  const [welcome, setWelcome] = useState(params.get('bienvenida') === '1')

  const load = useCallback(() => {
    if (!id) return
    leaguesApi.detail(Number(id)).then(setLeague)
  }, [id])

  useEffect(load, [load])

  const cycle = league?.current_cycle ?? null
  const isCreator = !!league && !!user && league.creator_id === user.id

  const pending = useMemo(() => {
    if (!cycle) return 0
    return cycle.markets.filter(m => m.is_open && !m.my_prediction).length
  }, [cycle])

  const total = cycle?.markets.length ?? 0
  const done = total - pending

  /** Al confirmar un pick, recarga; el checklist resalta el siguiente sin pick. */
  function handlePicked() {
    setPickMarket(null)
    load()
  }

  if (!league) return <div className="lg-page lg-skeleton" />

  // ------------------------------------------------ estado PENDING
  if (league.status === 'pending') {
    const missing = league.min_members - league.members.length
    return (
      <div className="lg-page lg-pending">
        <h1>{league.name}</h1>
        <div className="lg-pending__counter">
          {t('leagues.pending.counter', {
            have: league.members.length,
            need: league.min_members,
          })}
        </div>
        <div className="lg-invite__members">
          {league.members.map(m => (
            <span key={m.user_id} className="lg-avatar" title={m.display_name} />
          ))}
          {Array.from({ length: Math.max(missing, 0) }).map((_, i) => (
            <span key={i} className="lg-avatar lg-avatar--empty" />
          ))}
        </div>
        <button
          className="lg-btn lg-btn--primary lg-btn--xl"
          onClick={() => shareOnWhatsApp(league.name, cycle?.name ?? null, league.invite_code)}
        >
          {t('leagues.pending.share')}
        </button>
        <p className="lg-pending__hint">{t('leagues.pending.hint')}</p>
      </div>
    )
  }

  return (
    <div className="lg-page">
      {/* ------------------------------------------------ header */}
      <header className="lg-header">
        <h1 className="lg-header__name">{league.name}</h1>
        {cycle && (
          <div className="lg-header__cycle">
            <span className="lg-chip">{cycle.name}</span>
            {cycle.status === 'open' && <Countdown to={nextClose(cycle.markets)} />}
            <MyRankChip standings={league.standings} />
          </div>
        )}
      </header>

      {welcome && cycle && (
        <div className="lg-banner" onAnimationEnd={() => setWelcome(false)}>
          {t('leagues.welcome', { stack: fmt(cycle.initial_stack) })}
        </div>
      )}

      {/* ------------------------------------------------ estado SCORING */}
      {cycle?.status === 'scoring' && (
        <div className="lg-banner lg-banner--scoring">
          {t('leagues.scoring', { n: unresolvedCount(cycle.markets) })}
        </div>
      )}

      {/* ------------------------------------------------ estado RESOLVED */}
      {cycle?.status === 'resolved' ? (
        <CycleResultCard
          league={league}
          cycle={cycle}
          isCreator={isCreator}
          onNextCycle={() => navigate(`/ligas/${league.id}/nuevo-ciclo`)}
        />
      ) : (
        <>
          {/* ------------------------------------------------ tabs */}
          <nav className="lg-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'picks'}
              className={tab === 'picks' ? 'is-active' : ''}
              onClick={() => setTab('picks')}
            >
              {t('leagues.tabs.picks')}
            </button>
            <button
              role="tab"
              aria-selected={tab === 'tabla'}
              className={tab === 'tabla' ? 'is-active' : ''}
              onClick={() => setTab('tabla')}
            >
              {t('leagues.tabs.table')}
            </button>
          </nav>

          {tab === 'picks' && cycle && (
            <>
              <ProgressBar done={done} total={total} pending={pending} />
              <CycleChecklist
                cycle={cycle}
                memberCount={league.members.length}
                onPick={m => setPickMarket(m)}
              />
            </>
          )}

          {tab === 'tabla' && cycle && (
            <StandingsTable
              standings={league.standings}
              provisional
              unresolved={unresolvedCount(cycle.markets)}
            />
          )}
        </>
      )}

      {/* ------------------------------------------------ pick sheet */}
      {pickMarket && cycle && (
        <PickSheet
          cycle={cycle}
          market={pickMarket}
          onClose={() => setPickMarket(null)}
          onPicked={handlePicked}
        />
      )}
    </div>
  )
}

function ProgressBar({ done, total, pending }: { done: number; total: number; pending: number }) {
  const { t } = useTranslation()
  const complete = pending === 0 && total > 0
  return (
    <div className={`lg-progress ${complete ? 'lg-progress--done' : ''}`}>
      <div
        className="lg-progress__bar"
        style={{ width: total ? `${(done / total) * 100}%` : '0%' }}
      />
      <span className="lg-progress__label">
        {complete ? t('leagues.progress.done') : t('leagues.progress.pending', { n: pending })}
      </span>
    </div>
  )
}

function MyRankChip({ standings }: { standings: LeagueDetail['standings'] }) {
  const { t } = useTranslation()
  const idx = standings.findIndex(s => s.is_me)
  if (idx < 0) return null
  return (
    <span className="lg-chip lg-chip--rank">
      {t('leagues.myRank', { pos: idx + 1, total: standings.length })}
    </span>
  )
}

function nextClose(markets: CycleMarket[]): string {
  const open = markets.filter(m => m.is_open)
  if (!open.length) return new Date().toISOString()
  return open
    .map(m => m.closes_at)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
}

function unresolvedCount(markets: CycleMarket[]): number {
  return markets.filter(m => !m.my_prediction || m.my_prediction.status === 'open').length
}

function fmt(n: string | number): string {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
}
