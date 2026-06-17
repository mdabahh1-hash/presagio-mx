import React, { useState, useEffect } from 'react'
import { usersApi, type ApiLeaderboardEntry } from '../lib/api'

const MEDAL = ['🥇', '🥈', '🥉']

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function Leaderboard() {
  const [users, setUsers] = useState<ApiLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    usersApi.leaderboard(50)
      .then(setUsers)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 24px' }}>
      <div className="anim-1" style={{ marginBottom: 32 }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Clasificación
        </h1>
        <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', margin: 0 }}>
          Los mejores predictores de VEREDIKT, ordenados por puntos.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, height: 64, animation: 'livePulse 1.8s ease infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No se pudo cargar la clasificación. Intenta más tarde.
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Aún no hay predictores en la clasificación. ¡Sé el primero en operar!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u, i) => (
            <div
              key={u.id}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
                borderColor: i < 3 ? 'rgba(255,215,0,0.25)' : 'var(--border-subtle)',
              }}
            >
              <div style={{ width: 32, textAlign: 'center', flexShrink: 0, fontSize: i < 3 ? '1.3rem' : '0.95rem' }}>
                {i < 3 ? MEDAL[i] : <span className="font-mono" style={{ fontWeight: 800, color: 'var(--text-tertiary)' }}>{i + 1}</span>}
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #FFD700, #cc9900)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
              }}>
                {initials(u.display_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.display_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {u.accuracy}% precisión · {u.markets_traded} mercados
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
                  {Math.floor(u.points).toLocaleString('es-MX')}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 3, fontWeight: 600, letterSpacing: '0.06em' }}>PT</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
