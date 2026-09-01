import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi, setToken } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { loginPasskey, supportsPasskeys, isPasskeyCancel } from '../lib/webauthn'
import { translateApiError } from '../lib/errors'
import { consumeReturnTo } from '../lib/returnTo'

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)', borderRadius: 10,
    padding: '11px 14px', fontSize: '0.9rem', color: 'var(--text-primary)',
    fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.68rem', color: 'var(--text-tertiary)',
    display: 'block', marginBottom: 5, fontWeight: 700,
    letterSpacing: '0.07em', textTransform: 'uppercase',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--overlay)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 20,
          padding: '32px 28px 28px',
          width: '100%',
          maxWidth: 400,
          position: 'relative',
          boxShadow: '0 32px 80px var(--shadow-card), 0 0 0 1px var(--oro-dim)',
        }}
      >
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          borderRadius: '20px 20px 0 0',
          background: 'linear-gradient(90deg, var(--blue), var(--brand))',
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="2" y1="2" x2="11" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="11" y1="2" x2="2" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ── Verification step ── */}
        {step === 'verify' ? (
          <>
            <div style={{ marginBottom: 24, paddingRight: 36 }}>
              <div className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
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
                  style={{ ...inputStyle, fontSize: '1.6rem', letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'DM Mono' }}
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
                <div style={{
                  marginBottom: 14, padding: '10px 14px',
                  background: 'var(--red-soft)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 10, fontSize: '0.8rem', color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 6}
                style={{
                  width: '100%',
                  background: (loading || code.length < 6) ? 'var(--bg-elevated)' : 'var(--blue)',
                  border: (loading || code.length < 6) ? '1px solid var(--border-default)' : 'none',
                  borderRadius: 12, padding: '13px',
                  fontSize: '0.9rem', fontWeight: 700,
                  color: (loading || code.length < 6) ? 'var(--text-tertiary)' : '#07071A',
                  cursor: (loading || code.length < 6) ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans',
                  transition: 'all 0.15s',
                  boxShadow: (loading || code.length < 6) ? 'none' : '0 4px 20px var(--oro-glow)',
                }}
              >
                {loading ? t('auth.verifying') : t('auth.confirmAccount')}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setCode(''); setError('') }}
                style={{
                  width: '100%', marginTop: 10,
                  background: 'transparent', border: 'none',
                  fontSize: '0.8rem', color: 'var(--text-tertiary)',
                  cursor: 'pointer', fontFamily: 'DM Sans', padding: '8px',
                }}
              >
                {t('common.back')}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* ── Form step ── */}
            <div style={{ marginBottom: 22, paddingRight: 36 }}>
              <div className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {mode === 'login'
                  ? t('auth.loginSubtitle')
                  : t('auth.registerSubtitle')}
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 22,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12, padding: 4,
            }}>
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError('') }}
                  style={{
                    flex: 1, padding: '8px 10px',
                    background: mode === m ? 'var(--bg-elevated)' : 'transparent',
                    border: mode === m ? '1px solid var(--border-default)' : '1px solid transparent',
                    borderRadius: 9, cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 700,
                    color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontFamily: 'DM Sans', letterSpacing: '0.02em',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'login' ? t('auth.tabLogin') : t('auth.tabRegister')}
                </button>
              ))}
            </div>

            {/* Provider icon row (Polymarket-style) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <a href={authApi.googleUrl()} aria-label={t('nav.continueGoogle')} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 52, background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)', borderRadius: 12,
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </a>
              <a href={authApi.githubUrl()} aria-label={t('nav.continueGithub')} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 52, background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)', borderRadius: 12,
                textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.15s',
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.06em' }}>
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
                <div style={{
                  marginBottom: 14, padding: '10px 14px',
                  background: 'var(--red-soft)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 10, fontSize: '0.8rem', color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? 'var(--bg-elevated)' : 'var(--blue)',
                  border: loading ? '1px solid var(--border-default)' : 'none',
                  borderRadius: 12, padding: '13px',
                  fontSize: '0.9rem', fontWeight: 700,
                  color: loading ? 'var(--text-tertiary)' : '#07071A',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans', letterSpacing: '0.03em',
                  transition: 'all 0.15s',
                  boxShadow: loading ? 'none' : '0 4px 20px var(--oro-glow)',
                }}
              >
                {loading
                  ? t('auth.loadingBtn')
                  : mode === 'login' ? t('auth.tabLogin') : t('auth.createAccount')}
              </button>
            </form>

            {/* Passkey login (solo modo login, si el navegador lo soporta) */}
            {!hidePasskey && mode === 'login' && supportsPasskeys() && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
                <button
                  type="button"
                  onClick={handlePasskey}
                  disabled={passkeyLoading}
                  style={{
                    width: '100%', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)', borderRadius: 12,
                    padding: '13px 14px', fontSize: '0.85rem', color: 'var(--text-primary)',
                    cursor: passkeyLoading ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    opacity: passkeyLoading ? 0.6 : 1, transition: 'all 0.15s',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                    <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                    <path d="M2 12a10 10 0 0 1 18-6"/>
                    <path d="M2 16h.01"/>
                    <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                    <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                    <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
                  </svg>
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
