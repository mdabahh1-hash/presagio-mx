/**
 * Lobby de la liga: pantalla de espera (status pending) y "activa sin
 * jornada". Es lo primero que ven el creador y cada invitado, así que
 * responde tres preguntas de un vistazo: quién está dentro, cómo invito a
 * los demás, y qué vamos a predecir.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LeagueDetail, copyInviteLink, inviteUrl, shareOnWhatsApp } from '../../lib/leaguesApi'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { Countdown } from '../../pages/leagues/InviteLandingPage'
import { CyclePreview } from './CyclePreview'
import { cycleMarketToPreview } from './adapters'

interface Props {
  league: LeagueDetail
  isCreator: boolean
  /** Llega con ?creada=1 justo después de crear la liga. */
  created: boolean
  onDismissCreated: () => void
}

export function LeagueLobby({ league, isCreator, created, onDismissCreated }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const cycle = league.current_cycle
  const pending = league.status === 'pending'
  const creatorName =
    league.members.find(m => m.role === 'creator')?.display_name ??
    league.members.find(m => m.user_id === league.creator_id)?.display_name ??
    '—'
  const missing = pending ? Math.max(league.min_members - league.members.length, 0) : 0
  // El único botón dorado: abrir la jornada si falta; si no, invitar.
  const shareIsPrimary = !(isCreator && !cycle)

  const firstClose = cycle
    ? cycle.markets
        .filter(m => m.is_open)
        .map(m => m.closes_at)
        .sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null
    : null

  function share() {
    shareOnWhatsApp(league.name, cycle?.name ?? null, league.invite_code)
  }

  async function copy() {
    if (await copyInviteLink(league.invite_code)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="lg-page lg-page--form">
      <div className="lg-form anim-1">
        {created && (
          <div className="lg-banner" onAnimationEnd={onDismissCreated}>
            <Icon name="check" size={14} strokeWidth={2} />
            {t('leagues.create.created')}
          </div>
        )}

        <header className="lg-form__head">
          <h1>{league.name}</h1>
          <p>
            {t('leagues.lobby.createdBy', { name: creatorName })}
            {' · '}
            {pending
              ? t('leagues.lobby.startsWhen', { n: league.min_members })
              : t('leagues.lobby.membersCount', { count: league.members.length })}
          </p>
        </header>

        <section className="lg-form__section">
          <div className="lg-section-head">
            <h2 className="lg-form__label">{t('leagues.lobby.membersTitle')}</h2>
            <span className="meta-label num">
              {pending
                ? t('leagues.lobby.membersOf', { have: league.members.length, need: league.min_members })
                : t('leagues.lobby.membersCount', { count: league.members.length })}
            </span>
          </div>
          <ul className="card lg-members">
            {league.members.map(m => (
              <li key={m.user_id} className="list-row lg-member">
                <Avatar name={m.display_name} size={36} />
                <span className="lg-member__name">{m.display_name}</span>
                {m.role === 'creator' && <Badge>{t('leagues.lobby.roleCreator')}</Badge>}
              </li>
            ))}
            {Array.from({ length: missing }).map((_, i) => (
              <li key={`slot-${i}`} className="list-row lg-member is-empty">
                <span className="lg-slot" aria-hidden="true" />
                <span className="lg-member__name">{t('leagues.lobby.slotFree')}</span>
              </li>
            ))}
          </ul>
        </section>

        {!cycle && (
          <section className="card lg-empty">
            <span className="lg-empty__puck">
              <Icon name="hourglass" size={22} />
            </span>
            <p className="lg-empty__title">
              {isCreator ? t('leagues.lobby.noCycleTitleCreator') : t('leagues.lobby.noCycleTitleMember')}
            </p>
            <p className="lg-empty__hint">
              {isCreator
                ? t('leagues.lobby.noCycleHintCreator')
                : t('leagues.lobby.noCycleHintMember', { creator: creatorName })}
            </p>
            {isCreator && (
              <button
                type="button"
                className="btn btn-primary btn-lg lg-empty__cta"
                onClick={() => navigate(`/ligas/${league.id}/nuevo-ciclo`)}
              >
                {t('leagues.lobby.noCycleCta')}
              </button>
            )}
          </section>
        )}

        <div>
          <div className="lg-actions">
            <button
              type="button"
              className={`btn btn-lg ${shareIsPrimary ? 'btn-primary' : 'btn-secondary'}`}
              onClick={share}
            >
              <Icon name="share" size={16} />
              {t('leagues.lobby.whatsapp')}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? t('leagues.lobby.copied') : t('leagues.lobby.copyLink')}
            </button>
          </div>
          <p className="meta-label lg-link-line">{inviteUrl(league.invite_code).replace(/^https?:\/\//, '')}</p>
        </div>

        {cycle && (
          <CyclePreview
            markets={cycle.markets.map(cycleMarketToPreview)}
            subcategoryLabel={cycle.name}
            extra={
              firstClose ? (
                <span className="lg-first-close">
                  <Icon name="clock" size={14} />
                  <span>{t('leagues.lobby.firstClose')}</span>
                  <Countdown to={firstClose} />
                </span>
              ) : null
            }
          />
        )}
      </div>
    </div>
  )
}
