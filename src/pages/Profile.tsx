import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usersApi, authApi, type ApiPosition, type ApiHistoryEvent } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { HistoryList } from '../components/HistoryList'
import { ProfileHeaderCard } from '../components/profile/ProfileHeaderCard'
import { PnlChartCard } from '../components/profile/PnlChartCard'
import { PositionsTable } from '../components/profile/PositionsTable'
import { SettingsSection } from '../components/profile/SettingsSection'
import type { PricePoint } from '../types'

const STARTING_POINTS = 10_000

export function Profile() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [pointsHistory, setPointsHistory] = useState<PricePoint[]>([])
  const [history, setHistory] = useState<ApiHistoryEvent[]>([])
  const [activeTab, setActiveTab] = useState<'posiciones' | 'actividad'>('posiciones')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    usersApi.myPositions().then(setPositions).catch(() => {})
    usersApi.history().then(setHistory).catch(() => {})
    usersApi.pointsHistory(366)
      .then(data => {
        setPointsHistory(data.map(d => ({ date: d.date, price: d.price })))
      })
      .catch(err => console.error('pointsHistory error:', err))
  }, [user])

  const openSettings = () => {
    setSettingsOpen(true)
    // El contenido se monta en este render; el scroll espera al DOM.
    setTimeout(() => document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  if (!user) {
    return (
      <div className="page-container" style={{ paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
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

  const invested = positions.reduce((s, p) => s + p.avg_cost * p.shares, 0)
  const positionsValue = positions.reduce((s, p) => s + (p.current_value ?? p.avg_cost * p.shares), 0)
  // Misma fórmula que _pnl_and_volume en el backend (app/api/users.py):
  // apostar es P&L-neutral; solo las resoluciones lo mueven.
  const pnl = user.points + invested - STARTING_POINTS
  const wins = history.filter(e => e.type === 'win')
  const biggestWin = wins.length ? Math.max(...wins.map(e => e.amount)) : null

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 24 }}>

      {/* Fila superior: perfil + P&L */}
      <div className="anim-1 profile-top-grid">
        <ProfileHeaderCard
          variant="own"
          displayName={user.display_name}
          username={user.username}
          avatarUrl={user.avatar_url}
          createdAt={user.created_at}
          balance={user.points}
          positionsValue={positionsValue}
          biggestWin={biggestWin}
          predictions={user.total_predictions}
          onOpenSettings={openSettings}
        />
        <PnlChartCard pointsHistory={pointsHistory} pnl={pnl} />
      </div>

      {/* Tabs */}
      <div className="anim-2" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
        {(['posiciones', 'actividad'] as const).map(tab => (
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
            {tab === 'posiciones' ? t('profile.tabPositions') : t('profile.tabActivity')}
          </button>
        ))}
      </div>

      {activeTab === 'posiciones' && (
        <div className="anim-3">
          <PositionsTable positions={positions} history={history} />
        </div>
      )}

      {activeTab === 'actividad' && (
        <div className="anim-3">
          <HistoryList events={history} variant="own" />
        </div>
      )}

      <SettingsSection open={settingsOpen} />
    </div>
  )
}
