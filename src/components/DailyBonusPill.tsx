import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usersApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'

// "Day" is anchored to Mexico time so the boundary is midnight Mexico, matching the backend.
const mxDay = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) // YYYY-MM-DD

export function DailyBonusPill() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const [claiming, setClaiming] = useState(false)

  if (!user) return null

  const today = mxDay(new Date())
  if (mxDay(user.created_at) === today) return null // no bonus on registration day

  const lastDay = user.last_bonus_at ? mxDay(user.last_bonus_at) : null
  if (lastDay === today) return null // already claimed today

  const yesterday = mxDay(new Date(Date.now() - 86_400_000))
  const nextStreak = lastDay === yesterday ? user.streak + 1 : 1
  const amount = Math.min(100 + (nextStreak - 1) * 20, 300)

  const claim = async () => {
    setClaiming(true)
    try {
      await usersApi.claimDailyBonus()
      track('DailyBonus', { streak: nextStreak, amount })
      await refreshUser()
    } catch {
      await refreshUser().catch(() => {})
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="bonus-pill" style={{
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      background: 'var(--oro-dim)', border: '1px solid var(--oro-glow)',
      borderRadius: 99, padding: '4px 5px 4px 11px',
    }}>
      <span style={{ fontSize: '0.95rem', lineHeight: 1 }} aria-hidden>🎁</span>
      <span className="bonus-amount" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
        +{amount} PT
      </span>
      <button
        onClick={claim}
        disabled={claiming}
        style={{
          background: 'var(--oro-fill)', border: 'none', borderRadius: 99,
          padding: '5px 13px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em',
          color: '#07071A', cursor: claiming ? 'wait' : 'pointer', opacity: claiming ? 0.7 : 1,
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        {claiming ? '...' : t('bonus.claim')}
      </button>
    </div>
  )
}
