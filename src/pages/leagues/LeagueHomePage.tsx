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
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CycleMarket, LeagueDetail, leaguesApi, provisionalRanks } from '../../lib/leaguesApi'
import { useAuth } from '../../lib/AuthContext'
import { translateApiError } from '../../lib/errors'
import { formatDate, formatNum } from '../../lib/format'
import { setReturnTo } from '../../lib/returnTo'
import { Countdown } from './InviteLandingPage'
import { AuthModal } from '../../components/AuthModal'
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
  // 403/404/red: mensaje en vez de skeleton eterno. 401: pedir sesión y volver aquí.
  const [error, setError] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [tab, setTab] = useState<Tab>('picks')
  const [pickMarket, setPickMarket] = useState<CycleMarket | null>(null)
  const [welcome, setWelcome] = useState(params.get('bienvenida') === '1')
  // ?creada=1 llega desde CreateLeaguePage justo después de crear la liga.
  const [created, setCreated] = useState(params.get('creada') === '1')

  const load = useCallback(() => {
    if (!id) return
    setError(null)
    leaguesApi
      .detail(Number(id))
      .then(setLeague)
      .catch((e: Error & { status?: number }) => {
        if (e.status === 401) {
          setReturnTo(`/ligas/${id}`)
          setNeedsAuth(true)
          return
        }
        setError(translateApiError(e))
      })
  }, [id])

  useEffect(load, [load])
  // Al saltar de una liga a otra (mismo componente montado), volver a Picks.
  useEffect(() => setTab('picks'), [id])
  // Al iniciar sesión desde aquí, reintentar.
  useEffect(() => {
    if (user && needsAuth) {
      setNeedsAuth(false)
      load()
    }
  }, [user, needsAuth, load])

  const cycle = league?.current_cycle ?? null
  const isCreator = !!league && !!user && league.creator_id === user.id

  // pendientes = todavía puedo jugar; hechos = tengo pick (un mercado cerrado
  // sin pick no es ni lo uno ni lo otro: no infla el progreso).
  const { pending, done } = useMemo(() => {
    if (!cycle) return { pending: 0, done: 0 }
    return {
      pending: cycle.markets.filter(m => m.is_open && !m.my_prediction).length,
      done: cycle.markets.filter(m => !!m.my_prediction).length,
    }
  }, [cycle])

  const total = cycle?.markets.length ?? 0

  /** Al confirmar un pick, recarga; el checklist resalta el siguiente sin pick. */
  function handlePicked() {
    setPickMarket(null)
    load()
  }

  if (error || needsAuth) {
    return (
      <div className="lg-page lg-page--form">
        <section className="card lg-empty">
          <span className="lg-empty__puck">
            <Icon name={needsAuth ? 'lock' : 'ban'} size={22} />
          </span>
          <p className="lg-empty__title">{needsAuth ? t('errors.NOT_AUTHENTICATED') : error}</p>
          <Link to="/ligas" className="btn btn-secondary lg-empty__cta">
            {t('leagues.home.backToList')}
          </Link>
        </section>
        {needsAuth && <AuthModal initialMode="login" onClose={() => setNeedsAuth(false)} />}
      </div>
    )
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
  const myRank = myIdx >= 0 ? provisionalRanks(league.standings)[myIdx] : null
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
                  {myRank !== null ? t('leagues.home.rankValue', { pos: myRank, total: league.standings.length }) : '—'}
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

/**
 * Mercados del ciclo que aún no tienen resultado global. Usa `is_resolved`
 * del backend; si no llega (backend viejo), aproxima con el estado de mi pick.
 */
function unresolvedCount(markets: CycleMarket[]): number {
  return markets.filter(m =>
    m.is_resolved !== undefined ? !m.is_resolved : !m.my_prediction || m.my_prediction.status === 'open',
  ).length
}
