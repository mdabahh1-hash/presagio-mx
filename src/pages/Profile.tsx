import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, authApi, type ApiPosition, type ApiPointsHistory } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { FullChart } from '../components/SparkChart'
import { ReferralCard } from '../components/ReferralCard'
import { registerPasskey, supportsPasskeys, isPasskeyCancel } from '../lib/webauthn'
import { track } from '../lib/analytics'
import type { PricePoint } from '../types'
import { formatNum } from '../lib/format'
import { translateApiError } from '../lib/errors'

export function Profile() {
  const { t } = useTranslation()
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

  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [passkeyMsg, setPasskeyMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const addPasskey = async () => {
    setPasskeyBusy(true)
    setPasskeyMsg(null)
    try {
      await registerPasskey()
      track('PasskeyAdded')
      await refreshUser()
      setPasskeyMsg({ ok: true, text: t('profile.passkeyAdded') })
    } catch (err: unknown) {
      if (!isPasskeyCancel(err)) {
        setPasskeyMsg({ ok: false, text: err instanceof Error ? translateApiError(err) : t('profile.passkeyAddError') })
      }
    } finally {
      setPasskeyBusy(false)
    }
  }

  const removePasskey = async () => {
    setPasskeyBusy(true)
    setPasskeyMsg(null)
    try {
      await authApi.passkeyDelete()
      await refreshUser()
      setPasskeyMsg({ ok: true, text: t('profile.passkeyRemoved') })
    } catch (err: unknown) {
      setPasskeyMsg({ ok: false, text: translateApiError(err) })
    } finally {
      setPasskeyBusy(false)
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
          {t('profile.loginTitle')}
        </h2>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 28, fontSize: '0.9rem' }}>
          {t('profile.loginSubtitle')}
        </p>
        <a href={authApi.googleUrl()} style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'linear-gradient(135deg, var(--brand), #b03018)',
            border: 'none', padding: '14px 32px', color: '#fff',
            fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.9rem',
            borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 6px 24px var(--oro-glow)',
          }}>
            {t('profile.loginGoogle')}
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
            border: '3px solid var(--oro-glow)',
            flexShrink: 0, overflow: 'hidden',
            boxShadow: '0 0 20px var(--focus-ring)',
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
                { label: t('profile.accuracy'), value: `${user.accuracy}%`, color: 'var(--green)' },
                { label: t('profile.marketsMetric'), value: user.markets_traded.toString(), color: 'var(--text-primary)' },
                { label: t('profile.predictions'), value: user.total_predictions.toString(), color: 'var(--blue)' },
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
              {t('profile.availableBalance')}
            </div>
            <div className="font-mono" style={{
              fontSize: '2.8rem', fontWeight: 800,
              color: 'var(--gold)', letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              {formatNum(Math.floor(user.points))}
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
              {t('profile.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Email notifications toggle */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('profile.emailNotifTitle')}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('profile.emailNotifSub')}</div>
        </div>
        <button
          onClick={toggleEmailNotif}
          role="switch"
          aria-checked={emailNotif}
          aria-label={t('profile.emailNotifTitle')}
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

      {/* Seguridad: passkey */}
      {supportsPasskeys() && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('profile.securityTitle')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {t('profile.securitySub')}
              </div>
            </div>
            {user.has_passkey ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 700 }}>{t('profile.passkeyConfigured')}</span>
                <button
                  onClick={removePasskey}
                  disabled={passkeyBusy}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-default)',
                    borderRadius: 8, padding: '7px 12px', fontSize: '0.75rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600,
                    opacity: passkeyBusy ? 0.6 : 1,
                  }}
                >
                  {t('profile.passkeyDelete')}
                </button>
              </div>
            ) : (
              <button
                onClick={addPasskey}
                disabled={passkeyBusy}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 10, padding: '9px 16px', fontSize: '0.8rem',
                  color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700,
                  flexShrink: 0, opacity: passkeyBusy ? 0.6 : 1,
                }}
              >
                {passkeyBusy ? t('profile.passkeyWaiting') : t('profile.passkeyAdd')}
              </button>
            )}
          </div>
          {passkeyMsg && (
            <div style={{ marginTop: 10, fontSize: '0.78rem', color: passkeyMsg.ok ? 'var(--green)' : 'var(--red)' }}>
              {passkeyMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Referral */}
      <ReferralCard code={user.referral_code} />

      {/* Stats cards */}
      <div className="anim-2 profile-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: t('profile.balance'),
            value: `${formatNum(Math.floor(user.points))} PT`,
            sub: null,
            color: 'var(--gold)',
            border: 'var(--oro-glow)',
          },
          {
            label: t('profile.invested'),
            value: `${formatNum(Math.floor(totalInvested))} PT`,
            sub: t('profile.openPositions', { count: positions.length }),
            color: 'var(--text-primary)',
            border: 'transparent',
          },
          {
            label: t('profile.exactness'),
            value: `${user.accuracy}%`,
            sub: t('profile.correctRatio', { correct: user.correct_predictions, total: user.total_predictions }),
            color: 'var(--green)',
            border: 'var(--green-border)',
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
          {t('profile.pointsHistory')}
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
            {tab === 'posiciones' ? t('profile.tabPositions') : t('profile.tabHistory')}
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
                    {(() => {
                      // Binary positions have side YES/NO; multi positions carry the outcome label in outcome_key.
                      const isYes = pos.side === 'YES'
                      const isNo = pos.side === 'NO'
                      const label = pos.side ?? pos.outcome_key ?? '—'
                      const color = isYes ? 'var(--green)' : isNo ? 'var(--red)' : 'var(--gold)'
                      const bg = isYes ? 'var(--green-soft)' : isNo ? 'var(--red-soft)' : 'var(--oro-dim)'
                      const border = isYes ? 'var(--green-border)' : isNo ? 'var(--red-border)' : 'var(--oro-glow)'
                      return (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em',
                          textTransform: 'uppercase', color, background: bg,
                          border: `1px solid ${border}`, padding: '3px 10px', borderRadius: 99,
                        }}>
                          {label}
                        </span>
                      )
                    })()}
                    <p style={{ margin: '10px 0 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {pos.market_question}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('profile.sharesAbbr', { value: pos.shares.toFixed(2) })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {t('profile.avgCost', { value: pos.avg_cost.toFixed(1) })}
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
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{t('profile.noPositions')}</p>
            <Link to="/mercados" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              {t('profile.explore')}
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
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('profile.historySoon')}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{t('profile.historyPreparing')}</p>
        </div>
      )}
    </div>
  )
}
