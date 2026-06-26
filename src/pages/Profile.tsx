import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi, type ApiPosition, type ApiPointsHistory } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { FullChart } from '../components/SparkChart'
import { ReferralCard } from '../components/ReferralCard'
import type { PricePoint } from '../types'

export function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [pointsHistory, setPointsHistory] = useState<PricePoint[]>([])
  const [activeTab, setActiveTab] = useState<'posiciones' | 'historial'>('posiciones')
  const [emailNotif, setEmailNotif] = useState(true)

  useEffect(() => { if (user) setEmailNotif(user.email_notifications) }, [user])

  const toggleEmailNotif = async () => {
    const next = !emailNotif
    setEmailNotif(next)
    try {
      await usersApi.update({ email_notifications: next })
      await refreshUser()
    } catch {
      setEmailNotif(!next)
    }
  }

  useEffect(() => {
    if (!user) return
    usersApi.myPositions().then(setPositions).catch(() => {})
    usersApi.pointsHistory()
      .then(data => {
        setPointsHistory(data.map(d => ({ date: d.date, price: d.price })))
      })
      .catch(err => console.error('pointsHistory error:', err))
  }, [user])

  if (!user) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '1.5rem',
        }}>🔐</div>
        <h2 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Inicia sesión para ver tu perfil
        </h2>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 28, fontSize: '0.9rem' }}>
          Gestiona tu balance, posiciones e historial de operaciones.
        </p>
        <a href="/api/auth/google" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'linear-gradient(135deg, var(--brand), #b03018)',
            border: 'none', padding: '14px 32px', color: '#fff',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.9rem',
            borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255, 215, 0, 0.2)',
          }}>
            Iniciar sesión con Google
          </button>
        </a>
      </div>
    )
  }

  const initials = user.display_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()


  const totalInvested = positions.reduce((s, p) => s + p.avg_cost * p.shares, 0)

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

      {/* Profile header card */}
      <div className="anim-1 card" style={{ padding: '32px 32px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, var(--blue), var(--brand), var(--gold))',
        }} />
        <div className="profile-header-flex" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: user.avatar_url ? 'transparent' : 'linear-gradient(135deg, var(--brand), #8a2010)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 800, color: '#fff',
            fontFamily: 'DM Sans',
            border: '3px solid rgba(255, 215, 0, 0.25)',
            flexShrink: 0, overflow: 'hidden',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)',
          }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          {/* User info + metrics */}
          <div style={{ flex: 1 }}>
            <h1 className="font-display" style={{
              margin: '0 0 4px', fontSize: '1.7rem',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              {user.display_name}
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              @{user.username}
            </p>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'PRECISIÓN', value: `${user.accuracy}%`, color: 'var(--green)' },
                { label: 'MERCADOS', value: user.markets_traded.toString(), color: 'var(--text-primary)' },
                { label: 'PREDICCIONES', value: user.total_predictions.toString(), color: 'var(--blue)' },
              ].map(metric => (
                <div key={metric.label}>
                  <span style={{
                    fontSize: '0.65rem', color: 'var(--text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    display: 'block', marginBottom: 4, fontWeight: 600,
                  }}>
                    {metric.label}
                  </span>
                  <span className="font-mono" style={{
                    fontSize: '1.2rem', fontWeight: 800, color: metric.color,
                  }}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Balance + logout */}
          <div className="profile-header-balance" style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: '0.65rem', color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 6, fontWeight: 600,
            }}>
              SALDO DISPONIBLE
            </div>
            <div className="font-mono" style={{
              fontSize: '2.8rem', fontWeight: 800,
              color: 'var(--gold)', letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {Math.floor(user.points).toLocaleString('es-MX')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gold)', opacity: 0.5, marginTop: 4, fontWeight: 700 }}>PT</div>
            <button
              onClick={() => { logout(); navigate('/') }}
              style={{
                marginTop: 16, background: 'transparent',
                border: '1px solid var(--border-default)',
                borderRadius: 8, padding: '7px 16px',
                fontSize: '0.75rem', color: 'var(--text-tertiary)',
                cursor: 'pointer', fontFamily: 'DM Sans',
                transition: 'all 0.15s',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Email notifications toggle */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notificaciones por correo</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Te avisamos cuando tus mercados se resuelven</div>
        </div>
        <button
          onClick={toggleEmailNotif}
          role="switch"
          aria-checked={emailNotif}
          aria-label="Notificaciones por correo"
          style={{
            width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
            position: 'relative', flexShrink: 0,
            background: emailNotif ? 'var(--green)' : 'var(--bg-elevated)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: emailNotif ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      {/* Referral */}
      <ReferralCard code={user.referral_code} />

      {/* Stats cards */}
      <div className="anim-2 profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: 'SALDO',
            value: `${Math.floor(user.points).toLocaleString('es-MX')} PT`,
            sub: null,
            color: 'var(--gold)',
            border: 'rgba(255, 208, 96, 0.2)',
          },
          {
            label: 'INVERTIDO',
            value: `${Math.floor(totalInvested).toLocaleString('es-MX')} PT`,
            sub: `${positions.length} posiciones abiertas`,
            color: 'var(--text-primary)',
            border: 'transparent',
          },
          {
            label: 'EXACTITUD',
            value: `${user.accuracy}%`,
            sub: `${user.correct_predictions} / ${user.total_predictions} correctas`,
            color: 'var(--green)',
            border: 'rgba(0, 232, 125, 0.2)',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="card"
            style={{ padding: '22px 24px', borderColor: stat.border !== 'transparent' ? stat.border : undefined }}
          >
            <div style={{
              fontSize: '0.65rem', color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 10, fontWeight: 600,
            }}>
              {stat.label}
            </div>
            <div className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
              {stat.value}
            </div>
            {stat.sub && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                {stat.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* P&L chart */}
      <div className="anim-3 card" style={{ padding: '24px', marginBottom: 24 }}>
        <div className="exchange-header" style={{ marginBottom: 20 }}>
          Historial de puntos — 30 días
        </div>
        <FullChart data={pointsHistory} height={160} color="var(--gold)" />
      </div>

      {/* Tabs */}
      <div className="anim-4" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {(['posiciones', 'historial'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--blue)' : 'transparent'}`,
              padding: '10px 18px',
              fontSize: '0.85rem', fontWeight: 700,
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'DM Sans',
              letterSpacing: '0.05em', textTransform: 'capitalize',
              transition: 'color 0.15s', marginBottom: -1,
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Posiciones */}
      {activeTab === 'posiciones' && (
        positions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {positions.map((pos, i) => (
              <Link key={pos.id} to={`/mercado/${pos.market_id}`} style={{ textDecoration: 'none' }}>
                <div
                  className={`card anim-${Math.min(i + 1, 6)}`}
                  style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}
                >
                  <div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: pos.side === 'YES' ? 'var(--green)' : 'var(--red)',
                      background: pos.side === 'YES' ? 'rgba(0, 232, 125, 0.1)' : 'rgba(255, 45, 85, 0.1)',
                      border: `1px solid ${pos.side === 'YES' ? 'rgba(0, 232, 125, 0.25)' : 'rgba(255, 45, 85, 0.25)'}`,
                      padding: '3px 10px', borderRadius: 99,
                    }}>
                      {pos.side}
                    </span>
                    <p style={{ margin: '10px 0 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {pos.market_question}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {pos.shares.toFixed(2)} acc.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      costo prom. {pos.avg_cost.toFixed(1)} PT
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: '1.4rem',
            }}>📊</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Sin posiciones abiertas</p>
            <Link to="/mercados" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              Explorar mercados →
            </Link>
          </div>
        )
      )}

      {/* Historial */}
      {activeTab === 'historial' && (
        <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: '1.4rem',
          }}>📋</div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Historial completo próximamente</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Estamos preparando esta sección.</p>
        </div>
      )}
    </div>
  )
}
