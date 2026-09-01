/**
 * StandingsTable — tabla del ciclo, en vivo y final.
 * Mi fila resaltada. Durante el ciclo lleva nota "provisional".
 */
import { useTranslation } from 'react-i18next'
import { Standing } from '../../lib/leaguesApi'

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
        <p className="lg-standings__note">{t('leagues.table.provisional', { n: unresolved })}</p>
      )}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{t('leagues.table.member')}</th>
            <th className="num">{t('leagues.table.points')}</th>
            <th className="num">{t('leagues.table.hits')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.user_id} className={s.is_me ? 'is-me' : ''}>
              <td>{s.final_rank ?? i + 1}</td>
              <td>{s.display_name}</td>
              <td className="num">
                {Number(s.balance).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </td>
              <td className="num">{s.total_resolved > 0 ? `${s.hits}/${s.total_resolved}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
