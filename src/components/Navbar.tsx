import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoFull } from './Logo'
import { TICKER_ITEMS } from '../data/markets'
import { useAuth } from '../lib/AuthContext'
import { authApi } from '../lib/api'

export function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

          {/* Hamburger — hidden on desktop */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px', color: 'var(--text-primary)', display: 'none',
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
                {/* Live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.65rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.1em' }}>EN VIVO</span>
                </div>

                {/* Points badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10, padding: '7px 14px',
                }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.1em' }}>PT</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: '0.9rem',
                    fontWeight: 700, color: 'var(--text-primary)',
                  }}>
                    {Math.floor(user.points).toLocaleString('es-MX')}
                  </span>
                </div>

                {/* Avatar */}
                <Link to="/perfil" style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #8a2010)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, color: '#fff',
                    fontFamily: 'Syne', cursor: 'pointer',
                    border: location.pathname === '/perfil'
                      ? '2px solid var(--blue)'
                      : '2px solid rgba(79, 142, 255, 0.2)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: location.pathname === '/perfil' ? '0 0 12px rgba(79, 142, 255, 0.4)' : 'none',
                  }}>
                    {initials}
                  </div>
                </Link>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.03em',
                    transition: 'all 0.15s',
                  }}>
                    Google
                  </button>
                </a>
                <a href={authApi.githubUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    background: 'var(--brand)', border: 'none',
                    borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem',
                    color: '#fff', cursor: 'pointer', fontFamily: 'Syne',
                    fontWeight: 700, letterSpacing: '0.03em',
                  }}>
                    GitHub
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 96, left: 0, right: 0, bottom: 0,
          background: 'rgba(6, 6, 26, 0.98)', backdropFilter: 'blur(20px)',
          zIndex: 99, display: 'flex', flexDirection: 'column',
          padding: '20px 20px', gap: 6,
          borderTop: '1px solid var(--border-subtle)',
          overflowY: 'auto',
        }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={{
                textDecoration: 'none', padding: '14px 18px', borderRadius: 12,
                fontSize: '1rem', fontWeight: 700, fontFamily: 'Syne',
                color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'rgba(79, 142, 255, 0.1)' : 'transparent',
                border: `1px solid ${isActive(link.to) ? 'rgba(79, 142, 255, 0.2)' : 'var(--border-subtle)'}`,
              }}
            >
              {link.label}
            </Link>
          ))}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            {user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar">{initials}</div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne' }}>
                      {user.display_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                      {Math.floor(user.points).toLocaleString('es-MX')} PT
                    </div>
                  </div>
                </div>
                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    textDecoration: 'none', padding: '13px 18px', borderRadius: 12,
                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)', textAlign: 'center',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, padding: '13px 18px', fontSize: '0.875rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans',
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)', borderRadius: 12,
                    padding: '14px', fontSize: '0.9rem', color: 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600,
                  }}>
                    Entrar con Google
                  </button>
                </a>
                <a href={authApi.githubUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', background: 'var(--brand)', border: 'none',
                    borderRadius: 12, padding: '14px', fontSize: '0.9rem',
                    color: '#fff', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700,
                  }}>
                    Entrar con GitHub
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
