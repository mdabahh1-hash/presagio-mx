import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usersApi, type ApiFollowedUser } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
function fmtPnl(n: number) {
  const r = Math.round(n)
  return `${r >= 0 ? '+' : '−'}${Math.abs(r).toLocaleString('es-MX')} PT`
}
function fmtNum(n: number) {
  return Math.round(n).toLocaleString('es-MX')
}

function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,215,0,0.3)' }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #FFD700, #cc9900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
    }}>
      {initials(name)}
    </div>
  )
}

function positionTag(p: { side: string | null; outcome_key: string | null }) {
  if (p.side === 'YES') return 'SÍ'
  if (p.side === 'NO') return 'NO'
  return p.outcome_key ?? ''
}

export function Following() {
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<ApiFollowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let active = true
    setLoading(true)
    usersApi.following()
      .then(data => { if (active) setUsers(data) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, authLoading])

  async function unfollow(u: ApiFollowedUser) {
    setUsers(prev => prev.filter(x => x.id !== u.id))  // optimistic
    try {
      await usersApi.unfollow(u.username)
      track('Unfollow', { username: u.username, context: 'following_page' })
    } catch {
      setUsers(prev => [u, ...prev])  // revert
    }
  }

  if (authLoading || loading) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card" style={{ height: 100, animation: 'livePulse 1.8s ease infinite', marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Inicia sesión para seguir a otros usuarios.</p>
        <Link to="/" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          ← Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="font-display anim-1" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
        Siguiendo
      </h1>

      {error ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          No se pudo cargar la lista. Intenta más tarde.
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px' }}>Aún no sigues a nadie.</p>
          <Link to="/clasificacion" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
            Ver clasificación →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Link to={`/u/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', flex: 1, minWidth: 200 }}>
                  <Avatar name={u.display_name} url={u.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>@{u.username}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 800, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPnl(u.pnl)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>G/P</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--gold)' }}>{fmtNum(u.points)} PT</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>SALDO</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtNum(u.volume)} PT</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>INVERTIDO</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{u.accuracy}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>PRECISIÓN</div>
                  </div>
                  <button
                    onClick={() => unfollow(u)}
                    style={{
                      cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-default)', borderRadius: 10,
                      padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'DM Sans',
                    }}
                  >
                    Siguiendo ✓
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.positions_count === 0
                  ? 'Sin posiciones abiertas'
                  : <>
                      {u.positions_count} {u.positions_count === 1 ? 'posición' : 'posiciones'} —{' '}
                      {u.top_positions.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ' · '}
                          <span style={{ color: p.side === 'YES' ? 'var(--green)' : p.side === 'NO' ? 'var(--red)' : 'var(--blue)', fontWeight: 700 }}>
                            {positionTag(p)}
                          </span>{' '}
                          {p.market_question}
                        </span>
                      ))}
                    </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
