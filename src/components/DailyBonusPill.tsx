import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usersApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { Icon } from './Icon'

// "Day" is anchored to Mexico time so the boundary is midnight Mexico, matching the backend.
const mxDay = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) // YYYY-MM-DD

// Único pill de la app (radio 999): bonus diario reclamable. Acento suave.
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
  // Must mirror the backend formula in app/api/users.py (claim_daily_bonus).
  const amount = Math.min(1000 + (nextStreak - 1) * 200, 3000)

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
    <button
      className="bonus-pill"
      onClick={claim}
      disabled={claiming}
      title={t('bonus.claim')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: 'var(--accent-soft)', color: 'var(--accent)', border: 'none',
        borderRadius: 999, padding: '0 12px 0 10px', height: 34,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
        cursor: claiming ? 'wait' : 'pointer', opacity: claiming ? 0.7 : 1,
      }}
    >
      <Icon name="gift" size={15} />
      <span className="bonus-amount num">+{amount} PT</span>
      <span style={{ fontWeight: 500, opacity: 0.85 }}>· {claiming ? '…' : t('bonus.claim')}</span>
    </button>
  )
}
