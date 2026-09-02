import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, authApi } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import { ReferralCard } from '../ReferralCard'
import { registerPasskey, supportsPasskeys, isPasskeyCancel } from '../../lib/webauthn'
import { track } from '../../lib/analytics'
import { translateApiError } from '../../lib/errors'
import { Badge } from '../Badge'
import { Icon } from '../Icon'

// Configuración del perfil propio: email, passkey, referidos y logout.
// Colapsada por defecto; el engrane / "Invitar amigos" la abren.
export function SettingsSection({ open }: { open: boolean }) {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [emailNotif, setEmailNotif] = useState(true)
  useEffect(() => { if (user) setEmailNotif(user.email_notifications) }, [user])

  const toggleEmailNotif = async () => {
    const next = !emailNotif
    setEmailNotif(next)
    try {
      await usersApi.update({ email_notifications: next })
      await refreshUser()
    } catch {
      setEmailNotif(!next)
    }
  }

  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [passkeyMsg, setPasskeyMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const addPasskey = async () => {
    setPasskeyBusy(true)
    setPasskeyMsg(null)
    try {
      await registerPasskey()
      track('PasskeyAdded')
      await refreshUser()
      setPasskeyMsg({ ok: true, text: t('profile.passkeyAdded') })
    } catch (err: unknown) {
      if (!isPasskeyCancel(err)) {
        setPasskeyMsg({ ok: false, text: err instanceof Error ? translateApiError(err) : t('profile.passkeyAddError') })
      }
    } finally {
      setPasskeyBusy(false)
    }
  }

  const removePasskey = async () => {
    setPasskeyBusy(true)
    setPasskeyMsg(null)
    try {
      await authApi.passkeyDelete()
      await refreshUser()
      setPasskeyMsg({ ok: true, text: t('profile.passkeyRemoved') })
    } catch (err: unknown) {
      setPasskeyMsg({ ok: false, text: translateApiError(err) })
    } finally {
      setPasskeyBusy(false)
    }
  }

  if (!open || !user) return null

  return (
    <div id="settings" className="anim-1" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: 4 }}>{t('profile.settingsTitle')}</h3>

      {/* Email notifications toggle */}
      <div className="list-row" style={{ justifyContent: 'space-between', gap: 16, padding: '14px 0' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('profile.emailNotifTitle')}</div>
          <div className="meta-label">{t('profile.emailNotifSub')}</div>
        </div>
        <button
          onClick={toggleEmailNotif}
          role="switch"
          aria-checked={emailNotif}
          aria-label={t('profile.emailNotifTitle')}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
            position: 'relative', flexShrink: 0,
            background: emailNotif ? 'var(--text-primary)' : 'var(--border-default)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: emailNotif ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%', background: emailNotif ? 'var(--bg-base)' : 'var(--text-tertiary)',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      {/* Seguridad: passkey */}
      {supportsPasskeys() && (
        <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('profile.securityTitle')}</div>
              <div className="meta-label">{t('profile.securitySub')}</div>
            </div>
            {user.has_passkey ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Badge tone="green" icon="check">{t('profile.passkeyConfigured')}</Badge>
                <button className="btn btn-ghost btn-sm" onClick={removePasskey} disabled={passkeyBusy}>
                  {t('profile.passkeyDelete')}
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={addPasskey} disabled={passkeyBusy} style={{ flexShrink: 0 }}>
                <Icon name="key" size={14} />
                {passkeyBusy ? t('profile.passkeyWaiting') : t('profile.passkeyAdd')}
              </button>
            )}
          </div>
          {passkeyMsg && (
            <div style={{ fontSize: 13, color: passkeyMsg.ok ? 'var(--green)' : 'var(--red)' }}>
              {passkeyMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Referral */}
      <ReferralCard code={user.referral_code} />

      {/* Logout */}
      <button className="btn btn-ghost" onClick={() => { logout(); navigate('/') }} style={{ marginTop: 8, color: 'var(--red)' }}>
        <Icon name="logout" size={15} />
        {t('profile.logout')}
      </button>
    </div>
  )
}
