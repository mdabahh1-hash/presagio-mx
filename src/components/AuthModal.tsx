import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi, setToken } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { loginPasskey, supportsPasskeys, isPasskeyCancel } from '../lib/webauthn'
import { translateApiError } from '../lib/errors'
import { consumeReturnTo } from '../lib/returnTo'
import { Icon } from './Icon'
import { Tabs } from './Tabs'

interface AuthModalProps {
  onClose: () => void
  initialMode?: 'login' | 'register'
  // Flujos donde la passkey no va (landing de invitación de ligas: el login
  // llega después del antojo y passkey se ofrece al final del onboarding).
  hidePasskey?: boolean
}

export function AuthModal({ onClose, initialMode = 'login', hidePasskey = false }: AuthModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState('')
  const { refreshUser } = useAuth()

  // Si otra pantalla dejó un returnTo (p. ej. /l/:code?join=1), navegar ahí
  // al terminar el login en vez de quedarse donde estaba el modal.
  const finish = () => {
    const dest = consumeReturnTo()
    onClose()
    if (dest) navigate(dest)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const result = await authApi.emailLogin(email, password)
        setToken(result.token)
        await refreshUser()
        finish()
      } else {
        await authApi.emailRegister(email, password, name)
        setPendingEmail(email)
        setStep('verify')
      }
    } catch (err: unknown) {
      setError(translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await authApi.verifyEmail(pendingEmail, code)
      setToken(result.token)
      track('Signup', { method: 'email' })
      await refreshUser()
      finish()
    } catch (err: unknown) {
      setError(translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePasskey = async () => {
    setError('')
    setPasskeyLoading(true)
    try {
      await loginPasskey()
      track('Login', { method: 'passkey' })
      await refreshUser()
      finish()
    } catch (err: unknown) {
      // User cancelled the browser prompt → stay quiet
      if (!isPasskeyCancel(err) && err instanceof Error && err.message) setError(translateApiError(err))
    } finally {
      setPasskeyLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', display: 'block' }

  const labelStyle: React.CSSProperties = {
    fontSize: 13, color: 'var(--text-secondary)',
    display: 'block', marginBottom: 6, fontWeight: 500,
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
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
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          padding: '28px 24px 24px',
          width: '100%',
          maxWidth: 400,
          position: 'relative',
          boxShadow: 'var(--shadow-sheet)',
        }}
      >
        {/* Close button */}
        <button onClick={onClose} aria-label={t('common.close')} className="icon-btn" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32 }}>
          <Icon name="x" size={16} />
        </button>

        {/* ── Verification step ── */}
        {step === 'verify' ? (
          <>
            <div style={{ marginBottom: 24, paddingRight: 36 }}>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {t('auth.verifyTitle')}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.5 }}>
                {t('auth.verifySubtitle')}<br />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pendingEmail}</span>
              </div>
            </div>

            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('auth.codeLabel')}</label>
                <input
                  className="input num"
                  style={{ ...inputStyle, fontSize: 24, height: 52, letterSpacing: '0.3em', textAlign: 'center', fontWeight: 600 }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--red-soft)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading || code.length < 6} style={{ width: '100%' }}>
                {loading ? t('auth.verifying') : t('auth.confirmAccount')}
              </button>

              <button type="button" className="btn btn-ghost" onClick={() => { setStep('form'); setCode(''); setError('') }} style={{ width: '100%', marginTop: 8 }}>
                {t('common.back')}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* ── Form step ── */}
            <div style={{ marginBottom: 22, paddingRight: 36 }}>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {mode === 'login'
                  ? t('auth.loginSubtitle')
                  : t('auth.registerSubtitle')}
              </div>
            </div>

            {/* Mode tabs */}
            <div className="tabs-line" style={{ marginBottom: 18 }}>
              <Tabs<'login' | 'register'>
                size="sm"
                items={[
                  { key: 'login', label: t('auth.tabLogin') },
                  { key: 'register', label: t('auth.tabRegister') },
                ]}
                active={mode}
                onChange={m => { setMode(m); setError('') }}
              />
            </div>

            {/* Provider icon row (Polymarket-style) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <a href={authApi.googleUrl()} aria-label={t('nav.continueGoogle')} className="btn btn-secondary" style={{ flex: 1, height: 48 }}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </a>
              <a href={authApi.githubUrl()} aria-label={t('nav.continueGithub')} className="btn btn-secondary" style={{ flex: 1, height: 48 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span className="meta-label">
                {t('auth.orEmail')}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>{t('auth.nameLabel')}</label>
                    <input
                      className="input"
                      style={inputStyle}
                      type="text"
                      placeholder={t('auth.namePlaceholder')}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>{t('auth.emailLabel')}</label>
                  <input
                    className="input"
                    style={inputStyle}
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('auth.passwordLabel')}</label>
                  <input
                    className="input"
                    style={inputStyle}
                    type="password"
                    placeholder={mode === 'register' ? t('auth.passwordPlaceholderRegister') : '••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>

              {error && (
                <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--red-soft)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                {loading
                  ? t('auth.loadingBtn')
                  : mode === 'login' ? t('auth.tabLogin') : t('auth.createAccount')}
              </button>
            </form>

            {/* Passkey login (solo modo login, si el navegador lo soporta) */}
            {!hidePasskey && mode === 'login' && supportsPasskeys() && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
                <button type="button" className="btn btn-secondary btn-lg" onClick={handlePasskey} disabled={passkeyLoading} style={{ width: '100%' }}>
                  <Icon name="key" size={16} />
                  {passkeyLoading ? t('auth.passkeyConnecting') : t('auth.passkeyLogin')}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
