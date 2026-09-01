import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, authApi } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import { ReferralCard } from '../ReferralCard'
import { registerPasskey, supportsPasskeys, isPasskeyCancel } from '../../lib/webauthn'
import { track } from '../../lib/analytics'
import { translateApiError } from '../../lib/errors'

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
    <div id="settings" className="anim-1" style={{ marginTop: 32 }}>
      <div className="exchange-header" style={{ marginBottom: 14 }}>{t('profile.settingsTitle')}</div>

      {/* Email notifications toggle */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('profile.emailNotifTitle')}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('profile.emailNotifSub')}</div>
        </div>
        <button
          onClick={toggleEmailNotif}
          role="switch"
          aria-checked={emailNotif}
          aria-label={t('profile.emailNotifTitle')}
          style={{
            width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
            position: 'relative', flexShrink: 0,
            background: emailNotif ? 'var(--green)' : 'var(--bg-elevated)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: emailNotif ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      {/* Seguridad: passkey */}
      {supportsPasskeys() && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('profile.securityTitle')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {t('profile.securitySub')}
              </div>
            </div>
            {user.has_passkey ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 700 }}>{t('profile.passkeyConfigured')}</span>
                <button
                  onClick={removePasskey}
                  disabled={passkeyBusy}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-default)',
                    borderRadius: 8, padding: '7px 12px', fontSize: '0.75rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600,
                    opacity: passkeyBusy ? 0.6 : 1,
                  }}
                >
                  {t('profile.passkeyDelete')}
                </button>
              </div>
            ) : (
              <button
                onClick={addPasskey}
                disabled={passkeyBusy}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 10, padding: '9px 16px', fontSize: '0.8rem',
                  color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700,
                  flexShrink: 0, opacity: passkeyBusy ? 0.6 : 1,
                }}
              >
                {passkeyBusy ? t('profile.passkeyWaiting') : t('profile.passkeyAdd')}
              </button>
            )}
          </div>
          {passkeyMsg && (
            <div style={{ marginTop: 10, fontSize: '0.78rem', color: passkeyMsg.ok ? 'var(--green)' : 'var(--red)' }}>
              {passkeyMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Referral */}
      <ReferralCard code={user.referral_code} />

      {/* Logout */}
      <button
        onClick={() => { logout(); navigate('/') }}
        style={{
          marginTop: 4, background: 'transparent',
          border: '1px solid var(--red-border)',
          borderRadius: 10, padding: '10px 20px',
          fontSize: '0.8rem', color: 'var(--red)', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'DM Sans',
        }}
      >
        {t('profile.logout')}
      </button>
    </div>
  )
}
