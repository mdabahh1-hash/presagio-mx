/**
 * StandingsTable — tabla de la jornada, en vivo y final. Mismo patrón de
 * filas que la clasificación global (rank · avatar · nombre · puntos).
 * Mi fila resaltada. Durante la jornada lleva nota "provisional".
 */
import { useTranslation } from 'react-i18next'
import { Standing } from '../../lib/leaguesApi'
import { formatNum } from '../../lib/format'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'

export default function StandingsTable({
  standings,
  provisional,
  unresolved,
}: {
  standings: Standing[]
  provisional: boolean
  unresolved: number
}) {
  const { t } = useTranslation()
  return (
    <div className="lg-standings">
      {provisional && unresolved > 0 && (
        <p className="meta-label lg-standings__note">{t('leagues.table.provisional', { n: unresolved })}</p>
      )}
      <div className="card">
        {standings.map((s, i) => {
          const rank = s.final_rank ?? i + 1
          return (
            <div key={s.user_id} className={`list-row lg-standing${s.is_me ? ' is-me' : ''}`}>
              <span className={`lg-standing__rank num${rank <= 3 ? ' is-top' : ''}`}>
                {rank === 1 ? <Icon name="medal" size={16} /> : rank}
              </span>
              <Avatar name={s.display_name} size={36} />
              <div className="lg-standing__body">
                <div className="lg-standing__name">
                  {s.display_name}
                  {s.is_me && <span className="meta-label"> · {t('leagues.table.you')}</span>}
                </div>
                <div className="meta-label num">
                  {s.total_resolved > 0
                    ? t('leagues.table.hitsOf', { hits: s.hits, total: s.total_resolved })
                    : t('leagues.table.noHits')}
                </div>
              </div>
              <span className="lg-standing__pts num">{formatNum(Number(s.balance))}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
