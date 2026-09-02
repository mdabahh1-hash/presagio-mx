import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogoFull } from './Logo'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { authApi, marketsApi, type ApiMarket } from '../lib/api'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { displayPair } from '../lib/prices'
import { cleanLabel } from '../lib/mapMarket'
import type { Category } from '../types'
import { Icon } from './Icon'
import { Badge } from './Badge'
import { Avatar } from './Avatar'
import { MarketThumb } from './MarketThumb'
import { TeamMark } from './TeamMark'
import { AuthModal } from './AuthModal'
import { DailyBonusPill } from './DailyBonusPill'
import { formatNum } from '../lib/format'

/* Fila "Modo oscuro" (luna + switch) y opción "Usar tema del sistema".
   OJO: sus handlers NO cierran el menú — el dropdown desktop abre por hover
   y debe permanecer abierto mientras se interactúa con estos controles. */
function ThemeControls({ variant }: { variant: 'dropdown' | 'drawer' }) {
  const { t, i18n } = useTranslation()
  const { preference, resolved, setPreference } = useTheme()
  const isDark = resolved === 'dark'
  const pad = variant === 'drawer' ? '14px 16px' : '11px 14px'
  const radius = variant === 'drawer' ? 12 : 9
  const fontSize = variant === 'drawer' ? '0.9rem' : '0.875rem'

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: pad, borderRadius: radius,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize, fontWeight: 600, color: 'var(--text-secondary)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
          {t('nav.darkMode')}
        </span>
        <button
          role="switch"
          aria-checked={isDark}
          aria-label={t('nav.darkMode')}
          onClick={() => setPreference(isDark ? 'light' : 'dark')}
          style={{
            position: 'relative', width: 38, height: 22, borderRadius: 99,
            border: '1px solid var(--border-default)',
            background: isDark ? 'var(--text-primary)' : 'var(--border-default)',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: isDark ? 17 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: isDark ? 'var(--bg-base)' : 'var(--text-primary)',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>
      <button
        onClick={() => setPreference('system')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          textAlign: 'left', padding: pad, borderRadius: radius,
          border: 'none', cursor: 'pointer', fontSize, fontWeight: 600,
          color: preference === 'system' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          background: preference === 'system' ? 'var(--bg-hover)' : 'transparent',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>
        </svg>
        {t('nav.systemTheme')}
      </button>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: pad, borderRadius: radius,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize, fontWeight: 600, color: 'var(--text-secondary)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
          </svg>
          {t('nav.language')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['es', 'en'] as const).map(lng => {
            const active = i18n.language.startsWith(lng)
            return (
              <button
                key={lng}
                onClick={() => { void i18n.changeLanguage(lng) }}
                style={{
                  border: `1px solid ${active ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em', transition: 'all 0.15s',
                }}
              >
                {lng.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deskMenu, setDeskMenu] = useState(false)
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ApiMarket[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const searchRef = useRef<HTMLFormElement>(null)
  const dq = useDebouncedValue(q, 300)
  const { user, logout } = useAuth()

  // Autocompletado: busca con debounce y abre el panel al llegar la respuesta.
  // Sin estado de loading: mientras tecleas se muestran los resultados previos.
  useEffect(() => {
    const term = dq.trim()
    if (term.length < 2) { setResults(null); setSearchOpen(false); return }
    let cancelled = false
    marketsApi.list({ q: term, limit: 6 })
      .then(r => { if (!cancelled) { setResults(r); setHighlighted(-1); setSearchOpen(true) } })
      .catch(() => { if (!cancelled) { setResults(null); setSearchOpen(false) } })
    return () => { cancelled = true }
  }, [dq])

  // Cerrar al hacer click FUERA del form. mousedown (no blur): las filas del
  // panel viven dentro del form, así que su click navega antes de cerrar.
  useEffect(() => {
    if (!searchOpen) return
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setHighlighted(-1)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [searchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchOpen && results && highlighted >= 0) {
      if (highlighted < results.length) navigate(`/mercado/${results[highlighted].id}`)
      else navigate(`/mercados?q=${encodeURIComponent(q.trim())}`)
    } else if (q.trim()) {
      navigate(`/mercados?q=${encodeURIComponent(q)}`)
    }
    setSearchOpen(false)
    setHighlighted(-1)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false); setDeskMenu(false); setSearchOpen(false); setHighlighted(-1) }, [location.pathname])

  // Menú de escritorio: abre por click y cierra al hacer click fuera o con Escape
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!deskMenu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setDeskMenu(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDeskMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [deskMenu])

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/mercados', label: t('nav.markets') },
    { to: '/ligas', label: t('nav.leagues') },
    { to: '/clasificacion', label: t('nav.leaderboard') },
    { to: '/como-funciona', label: t('nav.howItWorks') },
    { to: '/proponer', label: t('nav.propose') },
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
      {/* Main navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)',
        // 12px: blur(24px) sobre un sticky repintaba en cada frame de scroll
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}>
        <div className="navbar-inner" style={{
          height: 'var(--nav-h)', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <LogoFull />
          </Link>

          {/* Búsqueda global (desktop) — navega a /mercados?q= */}
          <form className="navbar-search" ref={searchRef} onSubmit={handleSearch} style={{ position: 'relative', flex: '1 1 0%', minWidth: 120, maxWidth: 480 }}>
            <div className="input" style={{
              display: 'flex', alignItems: 'center', height: 38, gap: 8, padding: '0 10px 0 12px',
              background: 'var(--bg-surface)',
            }}>
              <Icon name="search" size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={q}
                onChange={e => {
                  setQ(e.target.value)
                  if (e.target.value.trim().length < 2) { setSearchOpen(false); setHighlighted(-1) }
                }}
                onFocus={() => { if (results && q.trim().length >= 2) setSearchOpen(true) }}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearchOpen(false); setHighlighted(-1); return }
                  if (!searchOpen || !results || results.length === 0) return
                  const total = results.length + 1  // + fila "ver todos"
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => (h + 1) % total) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => h < 0 ? total - 1 : (h - 1 + total) % total) }
                }}
                placeholder={t('home.searchPlaceholderDesktop')}
                aria-label={t('nav.searchAria')}
                role="combobox"
                aria-expanded={searchOpen}
                aria-controls="navbar-search-listbox"
                aria-autocomplete="list"
                aria-activedescendant={highlighted >= 0 ? `search-opt-${highlighted}` : undefined}
                style={{
                  flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                  padding: 0, fontSize: 14, fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                }}
              />
              {q && (
                <button type="button" onClick={() => { setQ(''); setResults(null); setSearchOpen(false); setHighlighted(-1) }} aria-label={t('common.close')} className="icon-btn" style={{ width: 26, height: 26 }}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            {/* Panel de autocompletado */}
            {searchOpen && results && (
              <div
                className="dropdown-panel"
                id="navbar-search-listbox"
                role="listbox"
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, zIndex: 200,
                  transformOrigin: 'top left',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 12, padding: 6,
                  boxShadow: 'var(--shadow-pop)',
                }}
              >
                {results.length === 0 ? (
                  <div style={{ padding: '14px 12px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {t('search.noResults', { q: dq.trim() })}
                  </div>
                ) : (
                  <>
                    {results.map((m, i) => {
                      const isMulti = m.market_type === 'multi'
                      const leader = isMulti ? [...(m.outcomes ?? [])].sort((a, b) => b.price - a.price)[0] : null
                      const yesColor = m.yes_price >= 65 ? 'var(--green)' : m.yes_price <= 35 ? 'var(--red)' : 'var(--text-primary)'
                      return (
                        <Link
                          key={m.id}
                          id={`search-opt-${i}`}
                          role="option"
                          aria-selected={highlighted === i}
                          to={`/mercado/${m.id}`}
                          onClick={() => { setSearchOpen(false); setHighlighted(-1) }}
                          onMouseEnter={() => setHighlighted(i)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                            background: highlighted === i ? 'var(--bg-hover)' : 'transparent',
                          }}
                        >
                          <MarketThumb market={{ id: m.id, question: m.question, outcomes: m.outcomes, imageUrl: m.image_url, subcategory: m.subcategory, category: m.category as Category }} size={32} radius={6} />
                          <span style={{
                            flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {cleanLabel(m.question)}
                          </span>
                          {m.status === 'pending_resolution' && (
                            <Badge tone="accent">{t('common.days.pending')}</Badge>
                          )}
                          {isMulti ? (leader && (
                            <span style={{ textAlign: 'right', flexShrink: 0, maxWidth: 110 }}>
                              <span className="num" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {Math.round(leader.price)}%
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                <TeamMark label={leader.label} outcomeKey={leader.outcome_key} sub={m.subcategory} marketId={m.id} size={14} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanLabel(leader.label)}</span>
                              </span>
                            </span>
                          )) : (
                            <span className="num" style={{ fontSize: 14, fontWeight: 600, color: yesColor, flexShrink: 0 }}>
                              {displayPair(m.yes_price).yes}%
                            </span>
                          )}
                        </Link>
                      )
                    })}
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 8px' }} />
                    <Link
                      id={`search-opt-${results.length}`}
                      role="option"
                      aria-selected={highlighted === results.length}
                      to={`/mercados?q=${encodeURIComponent(q.trim())}`}
                      onClick={() => { setSearchOpen(false); setHighlighted(-1) }}
                      onMouseEnter={() => setHighlighted(results.length)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                        background: highlighted === results.length ? 'var(--bg-hover)' : 'transparent',
                      }}
                    >
                      {t('search.viewAll')}
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  </>
                )}
              </div>
            )}
          </form>

          {/* Cómo funciona (desktop) */}
          <Link
            className="navbar-howitworks"
            to="/como-funciona"
            style={{
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              fontSize: 14, fontWeight: 500,
              color: isActive('/como-funciona') ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'color 0.15s',
            }}
          >
            {t('nav.howItWorks')}
          </Link>

          {/* Proponer mercado (desktop) */}
          <Link
            className="navbar-propose btn btn-secondary"
            to="/proponer"
            aria-label={t('nav.propose')}
            style={{ height: 36, flexShrink: 0 }}
          >
            <Icon name="plus" size={14} strokeWidth={2} />
            <span className="navbar-propose-label">{t('nav.propose')}</span>
          </Link>

          {/* Bonus diario — solo visible en móvil (en desktop vive en navbar-user) */}
          <div className="navbar-bonus-mobile">
            <DailyBonusPill />
          </div>

          {/* Hamburger — hidden on desktop, shown via CSS */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={t('nav.menu')}
            style={{
              background: menuOpen ? 'var(--bg-hover)' : 'none',
              border: '1px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              padding: '8px', color: 'var(--text-primary)', display: 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} strokeWidth={2} />
          </button>

          {/* Spacer pushes the user section to the right */}
          <div style={{ flex: 1 }} />

          {/* Desktop user section */}
          <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {user ? (
              <>
                <Link to="/perfil" style={{ textDecoration: 'none' }} title={t('nav.myProfile')}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: 5,
                    background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <span className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatNum(Math.floor(user.points))}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>PT</span>
                  </div>
                </Link>
                <DailyBonusPill />
                <Link to="/perfil" style={{ textDecoration: 'none', display: 'flex' }} aria-label={t('nav.myProfile')}>
                  <Avatar
                    name={user.display_name}
                    size={34}
                    style={{ boxShadow: location.pathname === '/perfil' ? '0 0 0 2px var(--text-primary)' : '0 0 0 1px var(--border-default)', cursor: 'pointer' }}
                  />
                </Link>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setAuthModal('login')}>
                  {t('nav.login')}
                </button>
                <button className="btn btn-primary" onClick={() => setAuthModal('register')}>
                  {t('nav.register')}
                </button>
              </div>
            )}

            {/* Desktop dropdown menu (click) */}
            <div className="nav-menu-wrap" ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDeskMenu(o => !o)}
                aria-label={t('nav.menu')}
                aria-expanded={deskMenu}
                className="icon-btn"
                style={{
                  width: 36, height: 36,
                  background: deskMenu ? 'var(--bg-hover)' : 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Icon name="menu" size={18} strokeWidth={2} />
              </button>

              {deskMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, paddingTop: 8, zIndex: 200 }}>
                <div
                  className="nav-menu-dropdown dropdown-panel"
                  style={{
                    minWidth: 220, padding: 6,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-pop)',
                  }}
                >
                  {navLinks.slice(1).map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDeskMenu(false)}
                      style={{
                        display: 'block', textDecoration: 'none',
                        padding: '9px 12px', borderRadius: 8,
                        fontSize: 14, fontWeight: 500,
                        color: isActive(item.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                        background: isActive(item.to) ? 'var(--bg-hover)' : 'transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 8px' }} />
                  <ThemeControls variant="dropdown" />
                  {user && (
                    <>
                      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 8px' }} />
                      <Link
                        to="/siguiendo"
                        onClick={() => setDeskMenu(false)}
                        style={{
                          display: 'block', textDecoration: 'none',
                          padding: '9px 12px', borderRadius: 8,
                          fontSize: 14, fontWeight: 500,
                          color: isActive('/siguiendo') ? 'var(--text-primary)' : 'var(--text-secondary)',
                          background: isActive('/siguiendo') ? 'var(--bg-hover)' : 'transparent',
                        }}
                      >
                        {t('nav.following')}
                      </Link>
                      <Link
                        to="/perfil"
                        onClick={() => setDeskMenu(false)}
                        style={{
                          display: 'block', textDecoration: 'none',
                          padding: '9px 12px', borderRadius: 8,
                          fontSize: 14, fontWeight: 500,
                          color: isActive('/perfil') ? 'var(--text-primary)' : 'var(--text-secondary)',
                          background: isActive('/perfil') ? 'var(--bg-hover)' : 'transparent',
                        }}
                      >
                        {t('nav.myProfile')}
                      </Link>
                      <button
                        onClick={() => { setDeskMenu(false); logout() }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 12px', borderRadius: 8, border: 'none',
                          fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                          color: 'var(--text-tertiary)', background: 'transparent', cursor: 'pointer',
                        }}
                      >
                        {t('nav.logout')}
                      </button>
                    </>
                  )}
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      {menuOpen && (
        <div className="mobile-drawer" style={{
          position: 'fixed',
          top: 'var(--nav-h)',
          left: 0, right: 0, bottom: 0,
          background: 'var(--bg-base)',
          zIndex: 99,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Navigation links */}
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{
              fontSize: 12, color: 'var(--text-tertiary)',
              fontWeight: 500,
              padding: '12px 4px 8px',
            }}>
              {t('nav.navigation')}
            </div>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px', borderRadius: 10, marginBottom: 2,
                  fontSize: 15, fontWeight: isActive(link.to) ? 600 : 500,
                  color: isActive(link.to) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.to) ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                <Icon name={link.to === '/' ? 'home' : link.to === '/ligas' ? 'users' : link.to === '/clasificacion' ? 'trophy' : link.to === '/proponer' ? 'plus' : link.to === '/como-funciona' ? 'list' : 'chart'} size={18} style={{ color: 'var(--text-tertiary)' }} />
                {link.label}
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
                  fontSize: 12, color: 'var(--text-tertiary)',
                  fontWeight: 500,
                  padding: '4px 4px 8px',
                }}>
                  {t('nav.account')}
                </div>
                {/* User card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px', borderRadius: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <Avatar name={user.display_name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {user.display_name}
                    </div>
                    <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {formatNum(Math.floor(user.points))} PT
                    </div>
                  </div>
                </div>

                <Link
                  to="/siguiendo"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 10,
                    fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {t('nav.following')}
                </Link>
                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 10,
                    fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {t('nav.myProfile')}
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, padding: '14px', fontSize: '0.875rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  fontSize: 12, color: 'var(--text-tertiary)',
                  fontWeight: 500,
                  padding: '4px 4px 8px',
                }}>
                  {t('nav.access')}
                </div>

                {/* Email/password CTA — primary */}
                <button className="btn btn-primary btn-lg" onClick={() => { setMenuOpen(false); setAuthModal('register') }}>
                  <Icon name="mail" size={18} />
                  {t('nav.registerEmail')}
                </button>

                {/* Login link */}
                <button className="btn btn-secondary btn-lg" onClick={() => { setMenuOpen(false); setAuthModal('login') }}>
                  {t('nav.haveAccount')}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{t('nav.or')}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                </div>

                {/* OAuth options */}
                <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
                  <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t('nav.continueGoogle')}
                  </button>
                </a>
                <a href={authApi.githubUrl()} style={{ textDecoration: 'none' }}>
                  <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    {t('nav.continueGithub')}
                  </button>
                </a>
              </div>
            )}

            {/* Preferencias (tema) */}
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0 12px' }} />
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, padding: '4px 4px 8px' }}>
              {t('nav.preferences')}
            </div>
            <ThemeControls variant="drawer" />
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
