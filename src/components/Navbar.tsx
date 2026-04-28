import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogoFull } from './Logo'
import { TICKER_ITEMS } from '../data/markets'
import { useAuth } from '../lib/AuthContext'
import { authApi } from '../lib/api'

export function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', height: 32, overflow: 'hidden', position: 'relative' }}>
        <div className="fade-left" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, zIndex: 2 }} />
        <div className="fade-right" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, zIndex: 2 }} />
        <div className="ticker-wrap" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
          <div className="ticker-inner" style={{ gap: 0 }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingRight: 40, fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
                <span style={{ color: item.price > 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{item.price}%</span>
                <span style={{ color: item.change > 0 ? 'var(--green)' : item.change < 0 ? 'var(--red)' : 'var(--text-tertiary)', fontSize: '0.65rem' }}>
                  {item.change > 0 ? `+${item.change}` : item.change}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: scrolled ? 'rgba(7, 7, 14, 0.95)' : 'rgba(7, 7, 14, 0.85)', backdropFilter: 'blur(20px)', borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent', transition: 'all 0.3s ease' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <LogoFull />
          </Link>

          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none', padding: '6px 14px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)', background: isActive(link.to) ? 'var(--bg-elevated)' : 'transparent', transition: 'all 0.15s' }}>
                {link.label}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 12px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.08em' }}>PT</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {Math.floor(user.points).toLocaleString('es-MX')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>EN VIVO</span>
                </div>
                <Link to="/perfil" style={{ textDecoration: 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), #7a1a08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', fontFamily: 'Syne', cursor: 'pointer', border: location.pathname === '/perfil' ? '2px solid var(--gold)' : '2px solid transparent', transition: 'border-color 0.15s' }}>
                    {initials}
                  </div>
                </Link>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, letterSpacing: '0.04em' }}>
                    Google
                  </button>
                </a>
                <a href={authApi.githubUrl()} style={{ textDecoration: 'none' }}>
                  <button style={{ background: 'var(--brand)', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', color: '#fff', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.04em' }}>
                    GitHub
                  </button>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
