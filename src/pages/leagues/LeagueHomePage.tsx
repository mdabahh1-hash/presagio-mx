/**
 * #/ligas/:id — Home de la liga.
 *
 * Estados:
 * - pending / activa sin jornada → LeagueLobby (miembros, invitar, preview).
 * - open / scoring → cabecera con jornada + countdown, fila de stats, tabs
 *   Picks (progreso + checklist) / Tabla (standings provisionales).
 * - resolved → podio (CycleResultCard) + siguiente jornada a un tap.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CycleMarket, LeagueDetail, leaguesApi } from '../../lib/leaguesApi'
import { useAuth } from '../../lib/AuthContext'
import { formatDate, formatNum } from '../../lib/format'
import { Countdown } from './InviteLandingPage'
import { Badge } from '../../components/Badge'
import { Icon } from '../../components/Icon'
import { Tabs } from '../../components/Tabs'
import { LeagueLobby } from '../../components/leagues/LeagueLobby'
import CycleChecklist from '../../components/leagues/CycleChecklist'
import StandingsTable from '../../components/leagues/StandingsTable'
import CycleResultCard from '../../components/leagues/CycleResultCard'
import PickSheet from '../../components/leagues/PickSheet'

type Tab = 'picks' | 'tabla'

export default function LeagueHomePage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [tab, setTab] = useState<Tab>('picks')
  const [pickMarket, setPickMarket] = useState<CycleMarket | null>(null)
  const [welcome, setWelcome] = useState(params.get('bienvenida') === '1')
  // ?creada=1 llega desde CreateLeaguePage justo después de crear la liga.
  const [created, setCreated] = useState(params.get('creada') === '1')

  const load = useCallback(() => {
    if (!id) return
    leaguesApi.detail(Number(id)).then(setLeague)
  }, [id])

  useEffect(load, [load])
  // Al saltar de una liga a otra (mismo componente montado), volver a Picks.
  useEffect(() => setTab('picks'), [id])

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

  if (!league) {
    return (
      <div className="lg-page lg-page--form lg-form" aria-busy="true">
        <div className="skeleton lg-sk lg-sk--title" />
        <div className="skeleton lg-sk lg-sk--input" />
        <div className="skeleton lg-sk lg-sk--card" />
      </div>
    )
  }

  if (league.status === 'pending' || !cycle) {
    return (
      <LeagueLobby
        league={league}
        isCreator={isCreator}
        created={created}
        onDismissCreated={() => setCreated(false)}
      />
    )
  }

  const next = nextClose(cycle.markets)
  const myIdx = league.standings.findIndex(s => s.is_me)
  const unresolved = unresolvedCount(cycle.markets)

  return (
    <div className="lg-page lg-page--form">
      <div className="lg-form anim-1">
        <header className="lg-form__head">
          <h1>{league.name}</h1>
          <div className="lg-cycle-line">
            <Badge icon="clock">{cycle.name}</Badge>
            {cycle.status === 'open' && next && <Countdown to={next} />}
            {cycle.status === 'scoring' && (
              <Badge tone="accent" icon="hourglass">
                {t('leagues.home.resolving')}
              </Badge>
            )}
          </div>
        </header>

        {welcome && (
          <div className="lg-banner" onAnimationEnd={() => setWelcome(false)}>
            <Icon name="check" size={14} strokeWidth={2} />
            {t('leagues.welcome', { stack: formatNum(Number(cycle.initial_stack)) })}
          </div>
        )}

        {cycle.status === 'scoring' && (
          <div className="lg-banner lg-banner--static">
            <Icon name="hourglass" size={14} strokeWidth={2} />
            {t('leagues.scoring', { n: unresolved })}
          </div>
        )}

        {cycle.status === 'resolved' ? (
          <CycleResultCard
            league={league}
            cycle={cycle}
            isCreator={isCreator}
            onNextCycle={() => navigate(`/ligas/${league.id}/nuevo-ciclo`)}
          />
        ) : (
          <>
            <div className="stat-row lg-stats">
              <div>
                <div className="stat-label">{t('leagues.home.myRank')}</div>
                <div className="stat-value">
                  {myIdx >= 0 ? t('leagues.home.rankValue', { pos: myIdx + 1, total: league.standings.length }) : '—'}
                </div>
              </div>
              <div>
                <div className="stat-label">{t('leagues.home.myPoints')}</div>
                <div className="stat-value">{cycle.my_balance != null ? formatNum(Number(cycle.my_balance)) : '—'}</div>
              </div>
              <div>
                <div className="stat-label">{t('leagues.home.picks')}</div>
                <div className="stat-value">{t('leagues.home.picksValue', { done, total })}</div>
              </div>
              <div>
                <div className="stat-label">{t('leagues.home.closes')}</div>
                <div className="stat-value">
                  {next ? formatDate(next, { weekday: 'short', day: 'numeric', month: 'short' }) : t('leagues.home.noOpen')}
                </div>
              </div>
            </div>

            <Tabs<Tab>
              items={[
                { key: 'picks', label: t('leagues.tabs.picks'), count: pending > 0 ? pending : undefined },
                { key: 'tabla', label: t('leagues.tabs.table') },
              ]}
              active={tab}
              onChange={setTab}
              className="tabs-line lg-tabs"
              ariaLabel={t('leagues.tabs.picks')}
            />

            {tab === 'picks' && (
              <>
                <div className="lg-progress">
                  <div className="prob-bar-track">
                    <div className="prob-bar-fill" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
                  </div>
                  <span className="meta-label num">
                    {pending === 0 && total > 0
                      ? t('leagues.progress.done')
                      : t('leagues.progress.pending', { n: pending })}
                  </span>
                </div>
                <CycleChecklist cycle={cycle} memberCount={league.members.length} onPick={m => setPickMarket(m)} />
              </>
            )}

            {tab === 'tabla' && <StandingsTable standings={league.standings} provisional unresolved={unresolved} />}
          </>
        )}
      </div>

      {pickMarket && (
        <PickSheet cycle={cycle} market={pickMarket} onClose={() => setPickMarket(null)} onPicked={handlePicked} />
      )}
    </div>
  )
}

/** Cierre más próximo entre los mercados abiertos; null si ya no hay. */
function nextClose(markets: CycleMarket[]): string | null {
  const open = markets.filter(m => m.is_open)
  if (!open.length) return null
  return open.map(m => m.closes_at).sort((a, b) => Date.parse(a) - Date.parse(b))[0]
}

function unresolvedCount(markets: CycleMarket[]): number {
  return markets.filter(m => !m.my_prediction || m.my_prediction.status === 'open').length
}
