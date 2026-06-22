import React, { useState } from 'react'
import { usersApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const utcDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10)

export function DailyBonusBanner() {
  const { user, refreshUser } = useAuth()
  const [claiming, setClaiming] = useState(false)
  const [result, setResult] = useState<{ awarded: number; streak: number } | null>(null)

  if (!user) return null

  const today = utcDay(new Date())
  const lastDay = user.last_bonus_at ? utcDay(user.last_bonus_at) : null
  const claimable = lastDay !== today

  if (!claimable && !result) return null

  // Preview amount/streak for the button
  const yesterday = utcDay(new Date(Date.now() - 86_400_000))
  const nextStreak = lastDay === yesterday ? user.streak + 1 : 1
  const amount = Math.min(100 + (nextStreak - 1) * 20, 300)

  const claim = async () => {
    setClaiming(true)
    try {
      const r = await usersApi.claimDailyBonus()
      setResult({ awarded: r.awarded, streak: r.streak })
      await refreshUser()
    } catch {
      /* already claimed or network — refresh to sync */
      await refreshUser().catch(() => {})
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))',
      border: '1px solid rgba(255,215,0,0.28)',
      borderRadius: 14, padding: '14px 18px', margin: '16px 0 4px',
    }}>
      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{result ? '✅' : '🎁'}</span>
      <div style={{ flex: 1, minWidth: 180 }}>
        {result ? (
          <>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--gold)' }}>
              +{result.awarded} PT reclamados
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Racha 🔥 {result.streak} {result.streak === 1 ? 'día' : 'días'} · vuelve mañana
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Bono diario {nextStreak > 1 && <span style={{ color: 'var(--gold)' }}>· Racha 🔥 {nextStreak}</span>}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Reclama <b style={{ color: 'var(--gold)' }}>+{amount} PT</b> por entrar hoy
            </div>
          </>
        )}
      </div>
      {!result && (
        <button
          onClick={claim}
          disabled={claiming}
          style={{
            background: 'var(--oro)', border: 'none', borderRadius: 10,
            padding: '11px 22px', color: '#07071A', fontFamily: 'DM Sans',
            fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em',
            cursor: claiming ? 'wait' : 'pointer', opacity: claiming ? 0.7 : 1,
            boxShadow: '0 4px 18px rgba(255,215,0,0.25)', flexShrink: 0,
          }}
        >
          {claiming ? 'RECLAMANDO...' : 'RECLAMAR'}
        </button>
      )}
    </div>
  )
}
