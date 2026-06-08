import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoFull } from './Logo'
import { TICKER_ITEMS } from '../data/markets'
import { useAuth } from '../lib/AuthContext'
import { authApi } from '../lib/api'
import { AuthModal } from './AuthModal'

export function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/mercados', label: 'Mercados' },
  ]

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  const initials = user
    ? user.display_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      {/* Ticker bar */}
      <div className="navbar-ticker" style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 34,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div className="fade-left" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, zIndex: 2 }} />
        <div className="fade-right" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, zIndex: 2 }} />
        <div className="ticker-wrap" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <div className="ticker-inner" style={{ gap: 0 }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                paddingRight: 48, fontSize: '0.72rem',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', letterSpacing: '0.06em' }}>{item.label}</span>
                <span style={{ color: item.price > 50 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{item.price}¢</span>
                <span style={{
                  color: item.change > 0 ? 'var(--green)' : item.change < 0 ? 'var(--red)' : 'var(--text-tertiary)',
                  fontSize: '0.65rem', fontWeight: 600,
                }}>
                  {item.change > 0 ? `+${item.change}` : item.change}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(6, 6, 26, 0.97)' : 'rgba(6, 6, 26, 0.88)',
        backdropFilter: 'blur(24px)',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div className="navbar-inner" style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 62, display: 'flex', alignItems: 'center', gap: 28,
        }}>
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <LogoFull />
          </Link>

          {/* Hamburger — hidden on desktop, shown via CSS */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú"
            style={{
              background: menuOpen ? 'rgba(79,142,255,0.1)' : 'none',
              border: menuOpen ? '1px solid rgba(79,142,255,0.2)' : '1px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              padding: '8px', color: 'var(--text-primary)', display: 'none',
              transition: 'all 0.15s',
            }}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Desktop nav links */}
          <div className="navbar-links" style={{ display: 'flex', gap: 2, flex: 1 }}>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  textDecoration: 'none', padding: '7px 16px', borderRadius: 8,
                  fontSize: '0.875rem', fontWeight: 600,
                  color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.to) ? 'rgba(79, 142, 255, 0.1)' : 'transparent',
                  border: `1px solid ${isActive(link.to) ? 'rgba(79, 142, 255, 0.2)' : 'transparent'}`,
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop user section */}
          <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.65rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.1em' }}>EN VIVO</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10, padding: '7px 14px',
                }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.1em' }}>PT</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {Math.floor(user.points).toLocaleString('es-MX')}
                  </span>
                </div>
                <Link to="/perfil" style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #8a2010)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, color: '#fff',
                    fontFamily: 'Syne', cursor: 'pointer',
                    border: location.pathname === '/perfil' ? '2px solid var(--blue)' : '2px solid rgba(79, 142, 255, 0.2)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: location.pathname === '/perfil' ? '0 0 12px rgba(79, 142, 255, 0.4)' : 'none',
                  }}>
                    {initials}
                  </div>
                </Link>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setAuthModal('login')}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.03em',
                    transition: 'all 0.15s',
                  }}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setAuthModal('register')}
                  style={{
                    background: 'var(--blue)',
                    border: 'none',
                    borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem',
                    color: '#fff', cursor: 'pointer', fontFamily: 'Syne',
                    fontWeight: 700, letterSpacing: '0.03em',
                    boxShadow: '0 2px 12px rgba(79,142,255,0.3)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  Registrarse
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          top: 62,
          left: 0, right: 0, bottom: 0,
          background: 'var(--bg-base)',
          zIndex: 99,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Navigation links */}
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              fontSize: '0.62rem', color: 'var(--text-tertiary)',
              fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '12px 4px 8px',
            }}>
              Navegación
            </div>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12, marginBottom: 4,
                  fontSize: '1rem', fontWeight: 700, fontFamily: 'Syne',
                  color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.to) ? 'rgba(79,142,255,0.1)' : 'transparent',
                  border: `1px solid ${isActive(link.to) ? 'rgba(79,142,255,0.25)' : 'transparent'}`,
                }}
              >
                {link.to === '/' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                )}
                {link.label}
                {isActive(link.to) && (
                  <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)' }} />
                )}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 16px' }} />

          {/* Account section */}
          <div style={{ padding: '0 16px 32px', flex: 1 }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  fontSize: '0.62rem', color: 'var(--text-tertiary)',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 4px 8px',
                }}>
                  Cuenta
                </div>
                {/* User card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px', borderRadius: 14,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--brand), #8a2010)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 800, color: '#fff', fontFamily: 'Syne',
                    border: '2px solid rgba(79,142,255,0.25)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne', marginBottom: 3 }}>
                      {user.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                      {Math.floor(user.points).toLocaleString('es-MX')} PT
                    </div>
                  </div>
                  <div className="live-dot" />
                </div>

                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '15px', borderRadius: 12,
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                    fontFamily: 'Syne',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Mi perfil
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, padding: '14px', fontSize: '0.875rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer',
                    fontFamily: 'Syne', fontWeight: 600,
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  fontSize: '0.62rem', color: 'var(--text-tertiary)',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 4px 8px',
                }}>
                  Acceso
                </div>

                {/* Email/password CTA — primary */}
                <button
                  onClick={() => { setMenuOpen(false); setAuthModal('register') }}
                  style={{
                    background: 'var(--blue)', border: 'none',
                    borderRadius: 14, padding: '16px',
                    fontSize: '0.95rem', fontWeight: 800, color: '#fff',
                    cursor: 'pointer', fontFamily: 'Syne',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: '0 4px 20px rgba(79,142,255,0.35)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  Registrarse con email
                </button>

                {/* Login link */}
                <button
                  onClick={() => { setMenuOpen(false); setAuthModal('login') }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 14, padding: '15px',
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'Syne',
                  }}
                >
                  Ya tengo cuenta — Iniciar sesión
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>o</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                </div>

                {/* OAuth options */}
                <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)', borderRadius: 14,
                    padding: '15px', fontSize: '0.9rem', color: 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar con Google
                  </button>
                </a>
                <a href={authApi.githubUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)', borderRadius: 14,
                    padding: '15px', fontSize: '0.9rem', color: 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Continuar con GitHub
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth modal */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </>
  )
}
