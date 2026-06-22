import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usersApi, type ApiProfilePublic, type ApiPosition } from '../lib/api'

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

export function PublicProfile() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<ApiProfilePublic | null>(null)
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setNotFound(false)
    usersApi.get(username)
      .then(p => {
        setProfile(p)
        return usersApi.publicPositions(username).then(setPositions).catch(() => {})
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        <div className="card" style={{ height: 140, animation: 'livePulse 1.8s ease infinite', marginBottom: 16 }} />
        <div className="card" style={{ height: 220, animation: 'livePulse 1.8s ease infinite' }} />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Usuario no encontrado.</p>
        <Link to="/clasificacion" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          ← Ver clasificación
        </Link>
      </div>
    )
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  const stats = [
    { label: 'Ganancia/Pérdida', value: fmtPnl(profile.pnl), color: profile.pnl >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'Precisión', value: `${profile.accuracy}%`, color: 'var(--text-primary)' },
    { label: 'Mercados', value: fmtNum(profile.markets_traded), color: 'var(--text-primary)' },
    { label: 'Invertido', value: `${fmtNum(profile.volume)} PT`, color: 'var(--gold)' },
  ]

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 24px' }}>
      {/* Header */}
      <div className="anim-1 card" style={{ padding: '28px 30px', marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,215,0,0.3)' }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #FFD700, #cc9900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
          }}>{initials(profile.display_name)}</div>
        )}
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            {profile.display_name}
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Miembro desde {memberSince}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card card" style={{ padding: '18px 16px', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Open positions */}
      <div className="exchange-header" style={{ marginBottom: 14 }}>Posiciones abiertas</div>
      {positions.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Sin posiciones abiertas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {positions.map(p => {
            const side = p.side === 'YES' ? 'SÍ' : 'NO'
            const color = p.side === 'YES' ? 'var(--green)' : 'var(--red)'
            const invested = p.avg_cost * p.shares
            return (
              <Link key={p.id} to={`/mercado/${p.market_id}`} className="lb-row card" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textDecoration: 'none',
              }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, color, flexShrink: 0,
                  background: `${color === 'var(--green)' ? 'rgba(0,232,125,0.1)' : 'rgba(255,45,85,0.1)'}`,
                  border: `1px solid ${color}`, borderRadius: 8, padding: '4px 10px',
                }}>{side}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.market_question}
                </span>
                <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {fmtNum(invested)} PT
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
