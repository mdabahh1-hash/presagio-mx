import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { borrarBienvenida, leerBienvenida } from '../lib/bienvenida'
import { Icon, type IconName } from './Icon'
import { Logo } from './Logo'

const BLOQUES: { icon: IconName; key: 'today' | 'soon' | 'future' }[] = [
  { icon: 'coin', key: 'today' },
  { icon: 'trophy', key: 'soon' },
  { icon: 'bank', key: 'future' },
]

// Solo para cuentas nuevas: sale una vez tras el registro (ver lib/bienvenida).
export function WelcomeModal() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user && leerBienvenida()) setOpen(true)
  }, [user])

  const close = useCallback(() => {
    borrarBienvenida()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: 440,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        <button onClick={close} aria-label={t('common.close')} className="icon-btn" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32 }}>
          <Icon name="x" size={16} />
        </button>

        <h2 id="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 600, margin: '0 32px 6px 0', color: 'var(--text-primary)' }}>
          <Logo size={26} />
          {t('welcome.title')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          {t('welcome.intro')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {BLOQUES.map(b => (
            <div key={b.key} style={{ display: 'flex', gap: 12 }}>
              <div style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              }}>
                <Icon name={b.icon} size={16} />
              </div>
              <div>
                <div className="meta-label" style={{ marginBottom: 2 }}>{t(`welcome.${b.key}Label`)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {t(`welcome.${b.key}Title`)}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {t(`welcome.${b.key}Body`)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={close} className="btn btn-primary" style={{ width: '100%' }}>
          {t('welcome.cta')}
        </button>
        <Link to="/como-funciona" onClick={close} className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }}>
          {t('welcome.howItWorks')}
        </Link>
      </div>
    </div>
  )
}
