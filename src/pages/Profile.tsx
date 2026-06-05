import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { FullChart } from '../components/SparkChart'
import type { PricePoint } from '../types'

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#c94828', 'Economía': '#f0c040', 'Deportes': '#00d084', 'Global': '#6888ff', 'Tech': '#a060ff',
}

interface UserPosition {
  id: number
  market_id: string
  side: string
  shares: number
  avg_cost: number
  updated_at: string
}

export function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [positions, setPositions] = useState<UserPosition[]>([])
  const [activeTab, setActiveTab] = useState<'posiciones' | 'historial'>('posiciones')

  useEffect(() => {
    if (!user) return
    usersApi.myPositions().then(setPositions).catch(() => {})
  }, [user])

  if (!user) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 16 }}>🔐</div>
        <h2 className="font-display" style={{ fontSize: '1.5rem', marginBottom: 12 }}>Inicia sesión para ver tu perfil</h2>
        <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
          <button style={{ background: 'var(--brand)', border: 'none', padding: '12px 24px', color: '#fff', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', borderRadius: 10, cursor: 'pointer' }}>
            Iniciar sesión con Google
          </button>
        </a>
      </div>
    )
  }

  const initials = user.display_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  // Mock P&L history from current points (replace with real endpoint later)
  const pnlHistory: PricePoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    price: user.points * (0.85 + i * 0.005 + Math.random() * 0.02),
  }))

  const totalInvested = positions.reduce((s, p) => s + p.avg_cost * p.shares, 0)

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Profile header */}
      <div className="anim-1 card" style={{ padding: '32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--brand), var(--gold), var(--brand))' }} />
        <div className="profile-header-flex" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--brand), #7a1a08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', fontFamily: 'Syne', border: '3px solid rgba(240,192,64,0.3)', flexShrink: 0, overflow: 'hidden' }}>
            {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="font-display" style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{user.display_name}</h1>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>@{user.username}</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Precisión</span>
                <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{user.accuracy}%</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Mercados</span>
                <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.markets_traded}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Predicciones</span>
                <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.total_predictions}</span>
              </div>
            </div>
          </div>
          <div className="profile-header-balance" style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Saldo disponible</div>
            <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {Math.floor(user.points).toLocaleString('es-MX')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)', opacity: 0.6, marginTop: 2 }}>PT</div>
            <button onClick={() => { logout(); navigate('/') }} style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="anim-2 profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Saldo</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)' }}>{Math.floor(user.points).toLocaleString('es-MX')} PT</div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Invertido</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Math.floor(totalInvested).toLocaleString('es-MX')} PT</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{positions.length} posiciones abiertas</div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Exactitud</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green)' }}>{user.accuracy}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{user.correct_predictions} / {user.total_predictions} correctas</div>
        </div>
      </div>

      {/* Points chart */}
      <div className="anim-3 card" style={{ padding: '24px', marginBottom: 24 }}>
        <h3 className="font-display" style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Historial de puntos (30 días)
        </h3>
        <FullChart data={pnlHistory} height={160} color="var(--gold)" />
      </div>

      {/* Tabs */}
      <div className="anim-4" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {(['posiciones', 'historial'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab ? 'var(--gold)' : 'transparent'}`, padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700, color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Syne', letterSpacing: '0.05em', textTransform: 'capitalize', transition: 'color 0.15s', marginBottom: -1 }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'posiciones' && (
        positions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {positions.map((pos, i) => (
              <Link key={pos.id} to={`/mercado/${pos.market_id}`} style={{ textDecoration: 'none' }}>
                <div className={`card anim-${Math.min(i + 1, 6)}`} style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: pos.side === 'YES' ? 'var(--green)' : 'var(--red)', background: pos.side === 'YES' ? 'rgba(0,208,132,0.1)' : 'rgba(255,69,96,0.1)', border: `1px solid ${pos.side === 'YES' ? 'rgba(0,208,132,0.2)' : 'rgba(255,69,96,0.2)'}`, padding: '2px 8px', borderRadius: 99 }}>
                      {pos.side}
                    </span>
                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mercado: {pos.market_id}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pos.shares.toFixed(2)} acciones</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>costo prom. {pos.avg_cost.toFixed(1)} PT/acción</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600 }}>Sin posiciones abiertas</p>
            <Link to="/mercados" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.875rem' }}>Explorar mercados →</Link>
          </div>
        )
      )}

      {activeTab === 'historial' && (
        <div style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 600 }}>Historial completo próximamente</p>
        </div>
      )}
    </div>
  )
}
