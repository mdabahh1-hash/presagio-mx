/**
 * #/ligas — Mis ligas + CTA crear.
 * El flujo de crear liga / nueva jornada vive en CreateLeaguePage.tsx.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LeagueSummary, leaguesApi } from '../../lib/leaguesApi'

export function LeaguesPage() {
  const { t } = useTranslation()
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null)

  useEffect(() => {
    leaguesApi.mine().then(setLeagues).catch(() => setLeagues([]))
  }, [])

  if (!leagues) return <div className="lg-page lg-skeleton" />

  return (
    <div className="lg-page">
      <header className="lg-header">
        <h1>{t('leagues.list.title')}</h1>
        <Link to="/ligas/crear" className="lg-btn lg-btn--primary">
          {t('leagues.list.create')}
        </Link>
      </header>

      {leagues.length === 0 ? (
        <div className="lg-empty lg-empty--hero">
          <p>{t('leagues.list.emptyTitle')}</p>
          <p className="lg-muted">{t('leagues.list.emptyBody')}</p>
          <Link to="/ligas/crear" className="lg-btn lg-btn--primary lg-btn--xl">
            {t('leagues.list.createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="lg-cards">
          {leagues.map(l => (
            <li key={l.id}>
              <Link to={`/ligas/${l.id}`} className="lg-card">
                <div className="lg-card__top">
                  <span className="lg-card__name">{l.name}</span>
                  {l.pending_picks > 0 && (
                    <span className="lg-chip lg-chip--alert">
                      {t('leagues.list.pendingPicks', { n: l.pending_picks })}
                    </span>
                  )}
                </div>
                <div className="lg-card__meta">
                  <span>{t('leagues.list.members', { n: l.member_count })}</span>
                  {l.cycle_name && <span>{l.cycle_name}</span>}
                  {l.my_rank && <span>{t('leagues.list.rank', { pos: l.my_rank })}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
