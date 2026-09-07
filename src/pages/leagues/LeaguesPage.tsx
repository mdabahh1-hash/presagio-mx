/**
 * #/ligas — Mis ligas + CTA crear.
 * El flujo de crear liga / nueva jornada vive en CreateLeaguePage.tsx.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LeagueSummary, leaguesApi } from '../../lib/leaguesApi'
import { Badge } from '../../components/Badge'
import { Icon } from '../../components/Icon'

export function LeaguesPage() {
  const { t } = useTranslation()
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null)

  useEffect(() => {
    leaguesApi.mine().then(setLeagues).catch(() => setLeagues([]))
  }, [])

  if (!leagues) {
    return (
      <div className="lg-page lg-page--form lg-form" aria-busy="true">
        <div className="skeleton lg-sk lg-sk--title" />
        <div className="skeleton lg-sk lg-sk--row" />
        <div className="skeleton lg-sk lg-sk--row" />
        <div className="skeleton lg-sk lg-sk--row" />
      </div>
    )
  }

  return (
    <div className="lg-page lg-page--form">
      <div className="lg-form anim-1">
        <header className="lg-form__head lg-form__head--row">
          <h1>{t('leagues.list.title')}</h1>
          {leagues.length > 0 && (
            <Link to="/ligas/crear" className="btn btn-primary">
              <Icon name="plus" size={16} strokeWidth={2} />
              {t('leagues.list.create')}
            </Link>
          )}
        </header>

        {leagues.length === 0 ? (
          <section className="card lg-empty">
            <span className="lg-empty__puck">
              <Icon name="trophy" size={22} />
            </span>
            <p className="lg-empty__title">{t('leagues.list.emptyTitle')}</p>
            <p className="lg-empty__hint">{t('leagues.list.emptyBody')}</p>
            <Link to="/ligas/crear" className="btn btn-primary btn-lg lg-empty__cta">
              {t('leagues.list.createFirst')}
            </Link>
          </section>
        ) : (
          <ul className="lg-leagues">
            {leagues.map(l => (
              <li key={l.id}>
                <Link to={`/ligas/${l.id}`} className="card lg-league">
                  <span className="lg-league__puck">
                    <Icon name="users" size={18} />
                  </span>
                  <span className="lg-league__body">
                    <span className="lg-league__name">{l.name}</span>
                    <span className="meta-label lg-league__meta">
                      <span>{t('leagues.lobby.membersCount', { count: l.member_count })}</span>
                      {l.cycle_name && <span>{l.cycle_name}</span>}
                      {l.my_rank && <span>{t('leagues.list.rank', { pos: l.my_rank })}</span>}
                    </span>
                  </span>
                  <LeagueStatus league={l} />
                  <Icon name="chevron-right" size={16} className="lg-league__chev" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function LeagueStatus({ league: l }: { league: LeagueSummary }) {
  const { t } = useTranslation()
  if (l.status === 'pending') {
    return <Badge>{t('leagues.list.waiting', { n: Math.max(l.min_members - l.member_count, 0) })}</Badge>
  }
  if (l.pending_picks > 0) {
    return <Badge tone="accent">{t('leagues.list.pendingPicks', { n: l.pending_picks })}</Badge>
  }
  if (!l.cycle_name) return <Badge>{t('leagues.list.noCycle')}</Badge>
  return null
}
