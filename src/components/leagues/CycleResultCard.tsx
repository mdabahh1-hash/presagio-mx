/**
 * CycleResultCard — podio al resolverse la jornada.
 *
 * - Podio 2-1-3 con iniciales, puntos finales y aciertos.
 * - "Compartir resultado": genera la card (src/lib/shareCard, 1080x1350
 *   feed / 1200x630 OG) y usa navigator.share con el archivo; si no se
 *   puede, descarga el PNG y abre WhatsApp con el texto+link.
 * - Para el creador, "Arrancar siguiente jornada" a UN TAP del podio.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, LeagueDetail, inviteUrl } from '../../lib/leaguesApi'
import { formatDateRange, formatNum } from '../../lib/format'
import { generateResultCard } from '../../lib/shareCard'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import StandingsTable from './StandingsTable'

export default function CycleResultCard({
  league,
  cycle,
  isCreator,
  onNextCycle,
}: {
  league: LeagueDetail
  cycle: Cycle
  isCreator: boolean
  onNextCycle: () => void
}) {
  const { t } = useTranslation()
  const [sharing, setSharing] = useState(false)
  const podium = league.standings.slice(0, 3)

  async function share() {
    const url = inviteUrl(league.invite_code)
    const text = t('leagues.result.shareText', {
      league: league.name,
      cycle: cycle.name,
      winner: podium[0]?.display_name ?? '',
    })
    setSharing(true)
    try {
      const blob = await generateResultCard(
        {
          leagueName: league.name,
          cycleName: cycle.name,
          podium: podium.map(s => ({
            name: s.display_name,
            points: formatNum(Number(s.balance)),
            hits: `${s.hits}/${s.total_resolved}`,
          })),
          footer: 'veredikt.mx',
        },
        'feed',
      )
      const file = new File([blob], 'veredikt-liga.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` })
        return
      }
      // Fallback: descargar la imagen y abrir WhatsApp con el texto+link.
      const dl = document.createElement('a')
      dl.href = URL.createObjectURL(blob)
      dl.download = 'veredikt-liga.png'
      dl.click()
      URL.revokeObjectURL(dl.href)
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
    } catch {
      // Cancelación o canvas no disponible: al menos compartir el texto.
      if (navigator.share) {
        await navigator.share({ text: `${text} ${url}` }).catch(() => undefined)
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="lg-result">
      <div className="lg-section-head">
        <h2 className="lg-form__label">{t('leagues.result.title', { cycle: cycle.name })}</h2>
        <span className="meta-label">{formatDateRange(new Date(cycle.starts_at), new Date(cycle.ends_at))}</span>
      </div>

      <div className="lg-podium">
        {/* orden visual 2-1-3 */}
        {[1, 0, 2].map(idx => {
          const s = podium[idx]
          if (!s) return <div key={`empty-${idx}`} className="card lg-podium__slot is-empty" aria-hidden="true" />
          return (
            <div key={s.user_id} className={`card lg-podium__slot${idx === 0 ? ' is-winner' : ''}`}>
              <Avatar name={s.display_name} size={48} />
              {idx === 0 ? (
                <Badge icon="medal">{t('leagues.result.winner')}</Badge>
              ) : (
                <Badge>{`${idx + 1}°`}</Badge>
              )}
              <span className="lg-podium__name">{s.display_name}</span>
              <span className="lg-podium__pts num">{formatNum(Number(s.balance))}</span>
              <span className="meta-label num">
                {t('leagues.table.hitsOf', { hits: s.hits, total: s.total_resolved })}
              </span>
            </div>
          )
        })}
      </div>

      <div className="lg-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={share} disabled={sharing}>
          <Icon name="share" size={16} />
          {sharing ? t('common.loading') : t('leagues.result.share')}
        </button>
        {isCreator && (
          <button type="button" className="btn btn-secondary btn-lg" onClick={onNextCycle}>
            {t('leagues.result.nextCycle')}
          </button>
        )}
      </div>

      <StandingsTable standings={league.standings} provisional={false} unresolved={0} />
    </div>
  )
}
