/**
 * #/l/:code — Landing PÚBLICA de invitación.
 *
 * La pantalla más importante del funnel. Reglas UX:
 * - Se ve SIN login. El login llega después del antojo, nunca antes.
 * - Un solo botón primario. Cero navegación de la app, cero distracciones.
 *   (App.tsx omite Navbar/Footer para /l/:code, igual que /embed/.)
 * - Tras auth, redirigir DIRECTO a la liga, nunca al home general:
 *   returnTo=/l/:code?join=1 → al volver con sesión se auto-une.
 * - Passkey nunca en este punto del flujo (hidePasskey en AuthModal).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { leaguesApi, InvitePreview } from '../../lib/leaguesApi'
import { useAuth } from '../../lib/AuthContext'
import { AuthModal } from '../../components/AuthModal'
import { Avatar } from '../../components/Avatar'
import { Badge } from '../../components/Badge'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { setReturnTo } from '../../lib/returnTo'

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const autoJoined = useRef(false)

  useEffect(() => {
    if (!code) return
    leaguesApi
      .invitePreview(code)
      .then(setPreview)
      .catch(() => setError(t('leagues.invite.notFound')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function doJoin() {
    if (!code) return
    setJoining(true)
    try {
      const league = await leaguesApi.join(code)
      navigate(`/ligas/${league.id}?bienvenida=1`)
    } catch (e) {
      setError((e as Error)?.message ?? t('common.error'))
      setJoining(false)
    }
  }

  // Auto-join al volver del login con ?join=1 (una sola vez).
  useEffect(() => {
    if (autoJoined.current) return
    if (user && params.get('join') === '1' && preview) {
      autoJoined.current = true
      void doJoin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params, preview])

  function handleJoin() {
    if (!code) return
    if (!user) {
      // Login después del antojo: guardar el retorno y abrir el modal
      // (Google arriba, email+código abajo; passkey oculto aquí).
      setReturnTo(`/l/${code}?join=1`)
      setAuthModal(true)
      return
    }
    void doJoin()
  }

  if (error) {
    return (
      <div className="lg-invite">
        <div className="lg-invite__card lg-empty">
          <Brand />
          <span className="lg-empty__puck">
            <Icon name="ban" size={22} />
          </span>
          <p className="lg-empty__title">{error}</p>
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="lg-invite" aria-busy="true">
        <div className="lg-invite__card">
          <Brand />
          <div className="skeleton lg-sk lg-sk--title" />
          <div className="skeleton lg-sk lg-sk--row" />
          <div className="skeleton lg-sk lg-sk--input" />
        </div>
      </div>
    )
  }

  const slots = Math.max(preview.min_members - preview.member_count, 0)
  // Backend nuevo manda nombres; uno viejo no → iniciales del creador y "?".
  const names =
    preview.member_names && preview.member_names.length > 0
      ? preview.member_names
      : [preview.creator_name, ...Array.from({ length: Math.max(preview.member_count - 1, 0) }, () => '')]

  return (
    <div className="lg-invite">
      <div className="lg-invite__card anim-1">
        <Brand />

        <Badge icon="users">{t('leagues.invite.badge')}</Badge>
        <h1 className="lg-invite__name">{preview.name}</h1>
        <p className="lg-invite__creator">{t('leagues.invite.createdBy', { name: preview.creator_name })}</p>

        <div className="lg-invite__members" aria-hidden="true">
          {names.map((n, i) => (
            <Avatar key={`m${i}`} name={n} size={36} className="lg-invite__avatar" />
          ))}
          {Array.from({ length: slots }).map((_, i) => (
            <span key={`s${i}`} className="lg-slot lg-invite__avatar" />
          ))}
        </div>
        <p className="meta-label num">
          {t('leagues.invite.members', { n: preview.member_count })}
          {slots > 0 && ` · ${t('leagues.invite.slotsLeft', { count: slots })}`}
        </p>

        {preview.cycle_name && (
          <div className="lg-invite__cycle">
            <Badge icon="clock">{preview.cycle_name}</Badge>
            {(preview.market_count ?? 0) > 0 && (
              <span className="meta-label num">{t('leagues.invite.markets', { n: preview.market_count })}</span>
            )}
            {preview.cycle_ends_at && <Countdown to={preview.cycle_ends_at} />}
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-lg lg-invite__cta"
          onClick={handleJoin}
          disabled={joining || authLoading}
        >
          {joining ? t('common.loading') : t('leagues.invite.cta')}
        </button>
        <p className="meta-label">{t('leagues.invite.free')}</p>

        <ul className="lg-invite__how">
          {(
            [
              ['check', t('leagues.invite.how1')],
              ['coin', t('leagues.invite.how2')],
              ['trophy', t('leagues.invite.how3')],
            ] as const
          ).map(([icon, text]) => (
            <li key={icon} className="list-row">
              <span className="lg-invite__how-icon">
                <Icon name={icon} size={15} />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        {authModal && <AuthModal initialMode="register" hidePasskey onClose={() => setAuthModal(false)} />}
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="lg-invite__brand">
      <Logo size={22} />
      <span>VEREDIKT</span>
    </div>
  )
}

/** Countdown relativo con el absoluto como subtítulo, nunca solo relativo. */
export function Countdown({ to }: { to: string }) {
  const { t } = useTranslation()
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(to)
  const ms = target.getTime() - Date.now()
  const urgent = ms > 0 && ms < 6 * 3600_000

  let rel: string
  if (ms <= 0) rel = t('leagues.countdown.closed')
  else {
    const h = Math.floor(ms / 3600_000)
    rel =
      h >= 48
        ? t('leagues.countdown.days', { n: Math.floor(h / 24) })
        : h >= 1
          ? t('leagues.countdown.hours', { n: h })
          : t('leagues.countdown.minutes', { n: Math.max(1, Math.floor(ms / 60_000)) })
  }

  const abs = target.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <span className={`lg-countdown${urgent ? ' lg-countdown--urgent' : ''}`} title={abs}>
      {rel}
      <small className="lg-countdown__abs">{abs}</small>
    </span>
  )
}
