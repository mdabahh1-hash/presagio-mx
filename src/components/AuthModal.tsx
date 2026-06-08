import React, { useState, useEffect } from 'react'
import { authApi, setToken } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

interface AuthModalProps {
  onClose: () => void
  initialMode?: 'login' | 'register'
}

export function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { refreshUser } = useAuth()

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
      let result: { token: string }
      if (mode === 'login') {
        result = await authApi.emailLogin(email, password)
      } else {
        result = await authApi.emailRegister(email, password, name)
      }
      setToken(result.token)
      await refreshUser()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(3, 3, 16, 0.88)',
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
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(79,142,255,0.1)',
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
          aria-label="Cerrar"
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

        {/* Heading */}
        <div style={{ marginBottom: 22, paddingRight: 36 }}>
          <div className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {mode === 'login'
              ? 'Entra con tu cuenta de Presagio'
              : 'Únete a la plataforma de predicciones'}
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
                fontFamily: 'Syne', letterSpacing: '0.02em',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{
                  fontSize: '0.68rem', color: 'var(--text-tertiary)',
                  display: 'block', marginBottom: 5, fontWeight: 700,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                  Nombre completo
                </label>
                <input
                  className="input-dark"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                  style={{ width: '100%' }}
                />
              </div>
            )}
            <div>
              <label style={{
                fontSize: '0.68rem', color: 'var(--text-tertiary)',
                display: 'block', marginBottom: 5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>
                Correo electrónico
              </label>
              <input
                className="input-dark"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{
                fontSize: '0.68rem', color: 'var(--text-tertiary)',
                display: 'block', marginBottom: 5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
              }}>
                Contraseña
              </label>
              <input
                className="input-dark"
                type="password"
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: 14, padding: '10px 14px',
              background: 'rgba(255, 45, 85, 0.1)',
              border: '1px solid rgba(255, 45, 85, 0.3)',
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
              color: loading ? 'var(--text-tertiary)' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne', letterSpacing: '0.03em',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(79, 142, 255, 0.35)',
            }}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.06em' }}>
            O CONTINUAR CON
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={authApi.googleUrl()} style={{ flex: 1, textDecoration: 'none' }}>
            <button style={{
              width: '100%', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', borderRadius: 12,
              padding: '11px 10px', fontSize: '0.82rem', color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.15s',
            }}>
              <svg viewBox="0 0 24 24" width="15" height="15">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </a>
          <a href={authApi.githubUrl()} style={{ flex: 1, textDecoration: 'none' }}>
            <button style={{
              width: '100%', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', borderRadius: 12,
              padding: '11px 10px', fontSize: '0.82rem', color: 'var(--text-primary)',
              cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.15s',
            }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
