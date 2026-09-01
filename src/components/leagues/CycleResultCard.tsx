/**
 * CycleResultCard — pantalla de podio al resolverse el ciclo.
 *
 * Reglas UX:
 * - Podio oro/plata/bronce con balance final y aciertos.
 * - Botón primario "Compartir resultado": genera la card (src/lib/shareCard,
 *   1080x1350 feed / 1200x630 OG, dark) y usa navigator.share con el archivo;
 *   si no se puede compartir archivos, descarga el PNG y abre WhatsApp con el
 *   texto+link como respaldo.
 * - Para el creador, "Arrancar siguiente ciclo" a UN TAP del podio.
 *   Ahí vive la retención, no en notificaciones.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cycle, LeagueDetail, inviteUrl } from '../../lib/leaguesApi'
import { generateResultCard } from '../../lib/shareCard'
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
  const rest = league.standings

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
            points: fmt(s.balance),
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
      <h2 className="lg-result__title">{t('leagues.result.title', { cycle: cycle.name })}</h2>

      <div className="lg-podium">
        {/* orden visual 2-1-3 */}
        {[1, 0, 2].map(idx => {
          const s = podium[idx]
          if (!s) return <div key={idx} className="lg-podium__slot" />
          return (
            <div key={s.user_id} className={`lg-podium__slot lg-podium__slot--${idx + 1}`}>
              <span className="lg-avatar lg-avatar--big" />
              <span className="lg-podium__name">{s.display_name}</span>
              <span className="lg-podium__pts">{fmt(s.balance)} pts</span>
              <span className="lg-podium__hits">
                {s.hits}/{s.total_resolved}
              </span>
            </div>
          )
        })}
      </div>

      <button className="lg-btn lg-btn--primary lg-btn--xl" onClick={share} disabled={sharing}>
        {sharing ? t('common.loading') : t('leagues.result.share')}
      </button>

      {isCreator && (
        <button className="lg-btn lg-btn--secondary" onClick={onNextCycle}>
          {t('leagues.result.nextCycle')}
        </button>
      )}

      <StandingsTable standings={rest} provisional={false} unresolved={0} />
    </div>
  )
}

function fmt(n: string | number): string {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
}
